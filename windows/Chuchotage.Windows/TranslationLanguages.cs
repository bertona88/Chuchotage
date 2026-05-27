namespace Chuchotage.Windows;

internal sealed record TranslationLanguage(string Code, string Name)
{
    public override string ToString() => Name;
}

internal static class TranslationLanguages
{
    public const string DefaultTargetLanguageCode = "en";

    public static readonly IReadOnlyList<TranslationLanguage> SupportedOutputLanguages =
    [
        new("es", "Spanish"),
        new("pt", "Portuguese"),
        new("fr", "French"),
        new("ja", "Japanese"),
        new("ru", "Russian"),
        new("zh", "Chinese"),
        new("de", "German"),
        new("ko", "Korean"),
        new("hi", "Hindi"),
        new("id", "Indonesian"),
        new("vi", "Vietnamese"),
        new("it", "Italian"),
        new("en", "English"),
    ];

    public static string SanitizeOutputLanguageCode(string? code)
    {
        return SupportedOutputLanguages.FirstOrDefault(language => language.Code == code)?.Code
            ?? DefaultTargetLanguageCode;
    }
}
