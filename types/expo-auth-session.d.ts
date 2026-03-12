declare module "expo-auth-session" {
  export type AuthResult =
    | { type: "success"; params: Record<string, any> }
    | { type: "cancel" | "dismiss" | "error"; params?: any };

  export function makeRedirectUri(options?: { useProxy?: boolean }): string;

  export function startAsync(options: { authUrl: string }): Promise<AuthResult>;
}
