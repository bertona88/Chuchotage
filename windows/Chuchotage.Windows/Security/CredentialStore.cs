using System.Security.Cryptography;
using System.Text;

namespace Chuchotage.Windows.Security;

internal sealed class CredentialStore
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("Chuchotage.Windows.OpenAI.ApiKey.v1");

    private readonly string _credentialPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "Chuchotage",
        "openai-api-key.bin");

    public string? ReadApiKey()
    {
        try
        {
            if (!File.Exists(_credentialPath))
            {
                return null;
            }

            var encrypted = File.ReadAllBytes(_credentialPath);
            var plain = ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(plain);
        }
        catch
        {
            return null;
        }
    }

    public void SaveApiKey(string apiKey)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_credentialPath)!);
        var plain = Encoding.UTF8.GetBytes(apiKey);
        var encrypted = ProtectedData.Protect(plain, Entropy, DataProtectionScope.CurrentUser);
        File.WriteAllBytes(_credentialPath, encrypted);
    }

    public void DeleteApiKey()
    {
        try
        {
            if (File.Exists(_credentialPath))
            {
                File.Delete(_credentialPath);
            }
        }
        catch
        {
            // Credential cleanup is best effort.
        }
    }
}
