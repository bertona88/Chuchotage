namespace Chuchotage.Windows.Security;

internal sealed record TranslationCredential(
    string BearerToken,
    bool ShouldSendSessionUpdate,
    string SourceDescription);
