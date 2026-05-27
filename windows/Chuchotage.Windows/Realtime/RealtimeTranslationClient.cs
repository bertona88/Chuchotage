using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Chuchotage.Windows;

namespace Chuchotage.Windows.Realtime;

internal sealed class RealtimeTranslationClient : IAsyncDisposable
{
    private const string TranslationWebSocketUrl =
        "wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate";

    private readonly SemaphoreSlim _sendGate = new(1, 1);
    private readonly ClientWebSocket _socket = new();
    private CancellationTokenSource? _receiveCts;
    private Task? _receiveTask;

    public event Action<byte[]>? OutputAudio;
    public event Action<string>? InputTranscriptDelta;
    public event Action<string>? OutputTranscriptDelta;
    public event Action<string>? ErrorReceived;
    public event Action? Closed;

    public async Task ConnectAsync(
        string bearerToken,
        bool shouldSendSessionUpdate,
        string targetLanguageCode,
        CancellationToken cancellationToken)
    {
        _socket.Options.SetRequestHeader("Authorization", $"Bearer {bearerToken}");
        _socket.Options.SetRequestHeader("User-Agent", OpenAiRequestHeaders.UserAgent);
        await _socket.ConnectAsync(new Uri(TranslationWebSocketUrl), cancellationToken).ConfigureAwait(false);
        if (shouldSendSessionUpdate)
        {
            await SendJsonAsync(BuildSessionUpdate(targetLanguageCode), cancellationToken).ConfigureAwait(false);
        }

        _receiveCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _receiveTask = Task.Run(() => ReceiveLoopAsync(_receiveCts.Token), CancellationToken.None);
    }

    public Task SendInputAudioAsync(byte[] pcm16, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Serialize(new
        {
            type = "session.input_audio_buffer.append",
            audio = Convert.ToBase64String(pcm16),
        });

        return SendJsonAsync(payload, cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            _receiveCts?.Cancel();

            if (_socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                await _socket
                    .CloseAsync(WebSocketCloseStatus.NormalClosure, "Stopped", timeout.Token)
                    .ConfigureAwait(false);
            }
        }
        catch
        {
            // Closing a live audio socket is best effort.
        }

        if (_receiveTask is not null)
        {
            try
            {
                await _receiveTask.ConfigureAwait(false);
            }
            catch
            {
                // Receive loop errors are surfaced through ErrorReceived while running.
            }
        }

        _receiveCts?.Dispose();
        _sendGate.Dispose();
        _socket.Dispose();
    }

    private async Task SendJsonAsync(string json, CancellationToken cancellationToken)
    {
        if (_socket.State != WebSocketState.Open)
        {
            return;
        }

        var bytes = Encoding.UTF8.GetBytes(json);
        await _sendGate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await _socket
                .SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, endOfMessage: true, cancellationToken)
                .ConfigureAwait(false);
        }
        finally
        {
            _sendGate.Release();
        }
    }

    private async Task ReceiveLoopAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[16 * 1024];

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                using var message = new MemoryStream();
                WebSocketReceiveResult result;

                do
                {
                    result = await _socket
                        .ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken)
                        .ConfigureAwait(false);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        Closed?.Invoke();
                        return;
                    }

                    message.Write(buffer, 0, result.Count);
                }
                while (!result.EndOfMessage);

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    HandleMessage(Encoding.UTF8.GetString(message.ToArray()));
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown.
        }
        catch (Exception error)
        {
            ErrorReceived?.Invoke(error.Message);
        }
    }

    private void HandleMessage(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var type = root.TryGetProperty("type", out var typeProperty)
            ? typeProperty.GetString()
            : null;

        switch (type)
        {
            case "session.output_audio.delta":
                if (TryGetString(root, "delta", out var audioDelta))
                {
                    OutputAudio?.Invoke(Convert.FromBase64String(audioDelta));
                }
                break;

            case "session.input_transcript.delta":
                if (TryGetString(root, "delta", out var inputDelta))
                {
                    InputTranscriptDelta?.Invoke(inputDelta);
                }
                break;

            case "session.output_transcript.delta":
                if (TryGetString(root, "delta", out var outputDelta))
                {
                    OutputTranscriptDelta?.Invoke(outputDelta);
                }
                break;

            case "error":
                ErrorReceived?.Invoke(ReadErrorMessage(root));
                break;
        }
    }

    private static string BuildSessionUpdate(string targetLanguageCode)
    {
        var sanitizedLanguage = TranslationLanguages.SanitizeOutputLanguageCode(targetLanguageCode);
        return JsonSerializer.Serialize(new
        {
            type = "session.update",
            session = new
            {
                audio = new
                {
                    input = new
                    {
                        transcription = new
                        {
                            model = "gpt-realtime-whisper",
                        },
                        noise_reduction = (object?)null,
                    },
                    output = new
                    {
                        language = sanitizedLanguage,
                    },
                },
            },
        });
    }

    private static bool TryGetString(JsonElement root, string propertyName, out string value)
    {
        if (root.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String)
        {
            value = property.GetString() ?? string.Empty;
            return !string.IsNullOrEmpty(value);
        }

        value = string.Empty;
        return false;
    }

    private static string ReadErrorMessage(JsonElement root)
    {
        if (root.TryGetProperty("error", out var error)
            && error.ValueKind == JsonValueKind.Object
            && TryGetString(error, "message", out var nestedMessage))
        {
            return nestedMessage;
        }

        if (TryGetString(root, "message", out var message))
        {
            return message;
        }

        return "Realtime translation failed.";
    }
}
