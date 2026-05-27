using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Chuchotage.Windows;
using Chuchotage.Windows.Diagnostics;

namespace Chuchotage.Windows.Security;

internal sealed class CodexAuthTranslationCredentialProvider
{
    private const string AuthIssuer = "https://auth.openai.com";
    private const string ClientId = "app_EMoamEEZ73f0CkXaXp7hrann";
    private const string ClientSecretUrl = "https://api.openai.com/v1/realtime/translations/client_secrets";
    private const int ClientSecretTtlSeconds = 600;
    private const long TokenRefreshSkewSeconds = 60;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = true,
    };

    private readonly string _authPath;
    private readonly HttpClient _httpClient;

    public CodexAuthTranslationCredentialProvider(HttpClient? httpClient = null)
    {
        _authPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".codex",
            "auth.json");
        _httpClient = httpClient ?? new HttpClient();
    }

    public bool HasCodexAuthFile => File.Exists(_authPath);

    public async Task<TranslationCredential> CreateCredentialAsync(
        string targetLanguageCode,
        CancellationToken cancellationToken)
    {
        var auth = await ReadAuthAsync(cancellationToken).ConfigureAwait(false);
        var apiKey = auth.OpenAiApiKey?.Trim();
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            return new TranslationCredential(apiKey, ShouldSendSessionUpdate: true, "Codex API key");
        }

        var accessToken = auth.Tokens?.AccessToken?.Trim();
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            throw new InvalidOperationException("Codex auth.json does not contain an access token.");
        }

        if (AccessTokenIsExpiring(accessToken))
        {
            auth = await RefreshAndSaveAsync(auth, cancellationToken).ConfigureAwait(false);
            accessToken = auth.Tokens?.AccessToken?.Trim();
        }

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            throw new InvalidOperationException("Codex token refresh did not return an access token.");
        }

        AppLog.Info("Creating Realtime Translation client secret from Codex auth.");
        var clientSecret = await CreateClientSecretWithRefreshRetryAsync(
            auth,
            accessToken,
            targetLanguageCode,
            cancellationToken).ConfigureAwait(false);

        return new TranslationCredential(
            clientSecret,
            ShouldSendSessionUpdate: false,
            "Codex ChatGPT sign-in");
    }

    private async Task<string> CreateClientSecretWithRefreshRetryAsync(
        CodexAuthFile auth,
        string accessToken,
        string targetLanguageCode,
        CancellationToken cancellationToken)
    {
        try
        {
            return await CreateClientSecretAsync(accessToken, targetLanguageCode, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (HttpRequestException exception) when (exception.StatusCode == HttpStatusCode.Unauthorized)
        {
            var refreshed = await RefreshAndSaveAsync(auth, cancellationToken).ConfigureAwait(false);
            var refreshedAccessToken = refreshed.Tokens?.AccessToken?.Trim();
            if (string.IsNullOrWhiteSpace(refreshedAccessToken) || refreshedAccessToken == accessToken)
            {
                throw new InvalidOperationException("Codex sign-in expired. Refresh the Codex login and try again.", exception);
            }

            return await CreateClientSecretAsync(refreshedAccessToken, targetLanguageCode, cancellationToken)
                .ConfigureAwait(false);
        }
    }

    private async Task<CodexAuthFile> RefreshAndSaveAsync(
        CodexAuthFile auth,
        CancellationToken cancellationToken)
    {
        var refreshToken = auth.Tokens?.RefreshToken?.Trim();
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new InvalidOperationException("Codex auth.json does not contain a refresh token.");
        }

        var requestBody = JsonSerializer.Serialize(new
        {
            client_id = ClientId,
            grant_type = "refresh_token",
            refresh_token = refreshToken,
        });

        using var response = await _httpClient
            .PostAsync(
                $"{AuthIssuer}/oauth/token",
                new StringContent(requestBody, Encoding.UTF8, "application/json"),
                cancellationToken)
            .ConfigureAwait(false);

        var text = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Codex token refresh failed. Sign in with Codex again and retry.");
        }

        var refresh = JsonSerializer.Deserialize<TokenRefreshResponse>(text, JsonOptions)
            ?? throw new InvalidOperationException("Codex token refresh returned an invalid response.");

        if (auth.Tokens is null)
        {
            auth.Tokens = new CodexTokens();
        }

        auth.Tokens.IdToken = FirstNonBlank(refresh.IdToken, auth.Tokens.IdToken);
        auth.Tokens.AccessToken = FirstNonBlank(refresh.AccessToken, auth.Tokens.AccessToken);
        auth.Tokens.RefreshToken = FirstNonBlank(refresh.RefreshToken, auth.Tokens.RefreshToken);
        auth.LastRefresh = DateTimeOffset.UtcNow.ToString("O");

        await WriteAuthAsync(auth, cancellationToken).ConfigureAwait(false);
        return auth;
    }

    private async Task<string> CreateClientSecretAsync(
        string accessToken,
        string targetLanguageCode,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, ClientSecretUrl);
        request.Headers.Authorization = new("Bearer", accessToken);
        request.Headers.UserAgent.ParseAdd(OpenAiRequestHeaders.UserAgent);
        request.Content = JsonContent.Create(ClientSecretRequestBody(targetLanguageCode));

        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        var text = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                ErrorMessageFrom(text, "Failed to create translation client secret."),
                null,
                response.StatusCode);
        }

        using var document = JsonDocument.Parse(text);
        if (document.RootElement.TryGetProperty("value", out var value)
            && value.ValueKind == JsonValueKind.String
            && !string.IsNullOrWhiteSpace(value.GetString()))
        {
            return value.GetString()!;
        }

        throw new InvalidOperationException("OpenAI did not return a translation client secret.");
    }

    private static object ClientSecretRequestBody(string targetLanguageCode)
    {
        var sanitizedLanguage = TranslationLanguages.SanitizeOutputLanguageCode(targetLanguageCode);
        return new
        {
            expires_after = new
            {
                anchor = "created_at",
                seconds = ClientSecretTtlSeconds,
            },
            session = new
            {
                model = "gpt-realtime-translate",
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
        };
    }

    private async Task<CodexAuthFile> ReadAuthAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_authPath))
        {
            throw new FileNotFoundException("Codex auth.json was not found.", _authPath);
        }

        await using var stream = File.OpenRead(_authPath);
        return await JsonSerializer.DeserializeAsync<CodexAuthFile>(stream, JsonOptions, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException("Codex auth.json is empty or invalid.");
    }

    private async Task WriteAuthAsync(CodexAuthFile auth, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_authPath)!);
        var tempPath = _authPath + ".tmp";
        await using (var stream = File.Create(tempPath))
        {
            await JsonSerializer.SerializeAsync(stream, auth, JsonOptions, cancellationToken)
                .ConfigureAwait(false);
        }

        File.Copy(tempPath, _authPath, overwrite: true);
        File.Delete(tempPath);
    }

    private static bool AccessTokenIsExpiring(string accessToken)
    {
        var expiresAt = ParseJwtExpirationEpochSeconds(accessToken);
        if (expiresAt is null)
        {
            return false;
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return expiresAt <= now + TokenRefreshSkewSeconds;
    }

    private static long? ParseJwtExpirationEpochSeconds(string token)
    {
        var parts = token.Split('.');
        if (parts.Length < 2 || string.IsNullOrWhiteSpace(parts[1]))
        {
            return null;
        }

        try
        {
            var payload = parts[1].Replace('-', '+').Replace('_', '/');
            payload = payload.PadRight(payload.Length + ((4 - payload.Length % 4) % 4), '=');
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(payload));
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.TryGetProperty("exp", out var exp)
                && exp.TryGetInt64(out var seconds)
                && seconds > 0)
            {
                return seconds;
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private static string ErrorMessageFrom(string text, string fallback)
    {
        try
        {
            using var document = JsonDocument.Parse(text);
            var root = document.RootElement;
            if (root.TryGetProperty("error", out var error))
            {
                if (error.ValueKind == JsonValueKind.Object
                    && error.TryGetProperty("message", out var message)
                    && message.ValueKind == JsonValueKind.String)
                {
                    return message.GetString() ?? fallback;
                }

                if (error.ValueKind == JsonValueKind.String)
                {
                    return error.GetString() ?? fallback;
                }
            }
        }
        catch
        {
            // Keep the user-facing fallback below.
        }

        return string.IsNullOrWhiteSpace(text) ? fallback : text;
    }

    private static string? FirstNonBlank(string? first, string? second)
    {
        return !string.IsNullOrWhiteSpace(first) ? first : second;
    }

    private sealed class CodexAuthFile
    {
        [JsonPropertyName("auth_mode")]
        public string? AuthMode { get; set; }

        [JsonPropertyName("OPENAI_API_KEY")]
        public string? OpenAiApiKey { get; set; }

        [JsonPropertyName("tokens")]
        public CodexTokens? Tokens { get; set; }

        [JsonPropertyName("last_refresh")]
        public string? LastRefresh { get; set; }
    }

    private sealed class CodexTokens
    {
        [JsonPropertyName("id_token")]
        public string? IdToken { get; set; }

        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("account_id")]
        public string? AccountId { get; set; }
    }

    private sealed class TokenRefreshResponse
    {
        [JsonPropertyName("id_token")]
        public string? IdToken { get; set; }

        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }
    }
}
