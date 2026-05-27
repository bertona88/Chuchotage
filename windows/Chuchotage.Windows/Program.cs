using System.Runtime.Versioning;

namespace Chuchotage.Windows;

internal static class Program
{
    [SupportedOSPlatform("windows")]
    private static void Main(string[] args)
    {
        new ElectronBridgeServer().RunAsync().GetAwaiter().GetResult();
    }
}
