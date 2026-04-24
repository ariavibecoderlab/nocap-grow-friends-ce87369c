import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import CodeBlock from "@/components/CodeBlock";
import ApiTryIt from "@/components/ApiTryIt";
import { ApiCredentialsProvider } from "@/contexts/ApiCredentialsContext";
import { generateApiGuidePdf } from "@/lib/generateApiGuidePdf";
import IntegrationRoadmap from "@/components/IntegrationRoadmap";

const ApiDocs = () => {
  return (
    <ApiCredentialsProvider>
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Code className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Developer Documentation</h1>
              <p className="text-muted-foreground">Integrate NoCap Wallet into your third-party application.</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <a href="/nocap-api-integration-guide.md" download>
                <FileText className="h-4 w-4 mr-1.5" />
                Markdown
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={generateApiGuidePdf}>
              <Download className="h-4 w-4 mr-1.5" />
              PDF
            </Button>
          </div>
        </div>

        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 overflow-x-auto">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="authentication">Auth Flow</TabsTrigger>
            <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="errors">Error Codes</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" forceMount className="data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>Follow these steps to begin integrating our wallet system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">1. Register your App</h3>
                  <p className="text-sm text-muted-foreground">
                    Merchants can register third-party applications through the Merchant Dashboard under the "API" tab. 
                    You will receive an <strong>API Key</strong> and an <strong>API Secret</strong>. Store the secret securely; it will only be shown once.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">2. User Authorization (OAuth 2.0)</h3>
                  <p className="text-sm text-muted-foreground">
                    To access a user's wallet, redirect them to our hosted authorization page. The user logs in, reviews permissions, 
                    and approves your app. You then exchange the authorization code for an access token. See the <strong>Auth Flow</strong> tab for full details.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">3. Sandbox Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable <strong>Sandbox Mode</strong> when creating an API app to test integrations without using real money. 
                    Sandbox transactions are immediately marked as completed and do not deduct from wallets.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-4 rounded-md space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">🧪 Test Access Token</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      When you create a sandbox app, a <strong>Test Access Token</strong> is automatically generated and shown in the credentials dialog. 
                      This token lets you skip the user authorization flow entirely — use it as the <code className="font-mono font-bold">Authorization: Bearer</code> header 
                      in place of a real user token.
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Need more tokens? Click <strong>"Generate Test Token"</strong> on any sandbox app in the Merchant Dashboard to create additional ones.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">4. Base URL</h3>
                  <p className="text-sm text-muted-foreground">All API requests should be made to our edge functions endpoint:</p>
                  <CodeBlock>{`https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/`}</CodeBlock>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">5. Rate Limits</h3>
                  <p className="text-sm text-muted-foreground">
                    All API endpoints are rate limited per API key. Exceeding the limit returns a <code className="text-primary font-bold">429 Too Many Requests</code> response with a <code className="text-primary font-bold">Retry-After</code> header.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-semibold">Endpoint</th>
                          <th className="text-left py-2 font-semibold">Limit</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/authorize</td>
                          <td className="py-2">N/A (user-facing page)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-token-exchange</td>
                          <td className="py-2">10 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-charge</td>
                          <td className="py-2">30 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-refund</td>
                          <td className="py-2">20 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-balance</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-charge-status</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-charges-list</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-branches</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-app-info</td>
                          <td className="py-2">120 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-referral-register</td>
                          <td className="py-2">10 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-referral-network</td>
                          <td className="py-2">30 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-topup</td>
                          <td className="py-2">30 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-cashback-history</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-distribute</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-products <span className="text-[10px] text-primary">v1.4</span></td>
                          <td className="py-2">120 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-orders <span className="text-[10px] text-primary">v1.4</span></td>
                          <td className="py-2">120 req/min</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authentication" forceMount className="data-[state=inactive]:hidden">
            <div className="space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>OAuth 2.0 Authorization Code Flow</CardTitle>
                  <CardDescription>How to authenticate users and obtain access tokens for your application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    NoCap uses the industry-standard <strong>OAuth 2.0 Authorization Code Grant</strong> to let users securely grant 
                    your application access to their wallet. The flow works in three steps:
                  </p>
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                      <div>
                        <p className="text-sm font-semibold">Redirect user to NoCap</p>
                        <p className="text-xs text-muted-foreground">User logs in and approves your app on our hosted page</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                      <div>
                        <p className="text-sm font-semibold">Receive authorization code</p>
                        <p className="text-xs text-muted-foreground">User is redirected back to your app with a temporary code</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                      <div>
                        <p className="text-sm font-semibold">Exchange code for access token</p>
                        <p className="text-xs text-muted-foreground">Your server exchanges the code for a long-lived access token</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-4 rounded-md">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Security Note:</strong> Never expose your API Secret in client-side code. The token exchange (Step 3) must always happen on your server.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Visual Sequence Diagram */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Authorization Flow Diagram</CardTitle>
                  <CardDescription>Visual overview of the OAuth 2.0 authorization code exchange.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px] p-4">
                      {/* Actors */}
                      <div className="grid grid-cols-4 gap-2 text-center mb-4">
                        <div className="rounded-lg bg-primary/10 border border-primary/20 py-2 px-1">
                          <p className="text-xs font-bold text-primary">User</p>
                          <p className="text-[10px] text-muted-foreground">Browser</p>
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 py-2 px-1">
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Your App</p>
                          <p className="text-[10px] text-muted-foreground">Frontend</p>
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 py-2 px-1">
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Your Server</p>
                          <p className="text-[10px] text-muted-foreground">Backend</p>
                        </div>
                        <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 py-2 px-1">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">NoCap</p>
                          <p className="text-[10px] text-muted-foreground">Auth Server</p>
                        </div>
                      </div>

                      {/* Vertical lines */}
                      <div className="relative grid grid-cols-4 gap-2">
                        {/* Dotted vertical lines behind steps */}
                        <div className="absolute inset-0 grid grid-cols-4 gap-2 pointer-events-none">
                          {[0,1,2,3].map(i => (
                            <div key={i} className="flex justify-center">
                              <div className="w-px h-full border-l border-dashed border-border" />
                            </div>
                          ))}
                        </div>

                        {/* Steps */}
                        <div className="relative col-span-4 space-y-3">
                          {/* Step 1: User clicks "Pay with NoCap" */}
                          <div className="flex items-center gap-1 px-2">
                            <div className="w-1/4 flex justify-center">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                            </div>
                            <div className="w-2/4 relative">
                              <div className="h-px bg-primary w-full" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-primary border-y-[3px] border-y-transparent" />
                              <p className="text-[10px] text-center text-muted-foreground mt-1">Clicks "Pay with NoCap"</p>
                            </div>
                            <div className="w-1/4" />
                          </div>

                          {/* Step 2: Redirect to /authorize */}
                          <div className="flex items-center gap-1 px-2">
                            <div className="w-1/4" />
                            <div className="w-3/4 relative">
                              <div className="h-px bg-primary w-full" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-primary border-y-[3px] border-y-transparent" />
                              <p className="text-[10px] text-center text-muted-foreground mt-1">
                                <span className="font-mono text-primary font-semibold">302</span> Redirect → <span className="font-mono">/authorize?app_id=...&redirect_uri=...&scope=...&state=...</span>
                              </p>
                            </div>
                          </div>

                          {/* Step 3: User logs in & approves */}
                          <div className="flex items-center gap-1 px-2">
                            <div className="w-1/4 flex justify-center">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">3</span>
                            </div>
                            <div className="w-1/2" />
                            <div className="w-1/4 flex justify-center">
                              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold text-center">User logs in<br/>& approves</p>
                              </div>
                            </div>
                          </div>

                          {/* Step 4: Redirect back with code */}
                          <div className="flex items-center gap-1 px-2">
                            <div className="w-1/4" />
                            <div className="w-2/4 relative">
                              <div className="h-px bg-green-500 w-full" />
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-r-4 border-r-green-500 border-y-[3px] border-y-transparent" />
                              <p className="text-[10px] text-center text-muted-foreground mt-1">
                                <span className="font-mono text-green-600 dark:text-green-400 font-semibold">302</span> Redirect → <span className="font-mono">callback?code=AUTH_CODE&state=...</span>
                              </p>
                            </div>
                            <div className="w-1/4" />
                          </div>

                          {/* Step 5: Server exchanges code */}
                          <div className="flex items-center gap-1 px-2">
                            <div className="w-1/4" />
                            <div className="w-1/4" />
                            <div className="w-2/4 relative">
                              <div className="h-px bg-blue-500 w-full" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-blue-500 border-y-[3px] border-y-transparent" />
                              <p className="text-[10px] text-center text-muted-foreground mt-1">
                                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">POST</span> <span className="font-mono">/api-token-exchange</span> {`{ code, app_id, app_secret }`}
                              </p>
                            </div>
                          </div>

                          {/* Step 6: Returns access token */}
                          <div className="flex items-center gap-1 px-2">
                            <div className="w-1/4" />
                            <div className="w-1/4" />
                            <div className="w-2/4 relative">
                              <div className="h-px bg-green-500 w-full" />
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-r-4 border-r-green-500 border-y-[3px] border-y-transparent" />
                              <p className="text-[10px] text-center text-muted-foreground mt-1">
                                <span className="font-mono text-green-600 dark:text-green-400 font-semibold">200</span> {`{ access_token, token_type, expires_in }`}
                              </p>
                            </div>
                          </div>

                          {/* Step 7: Use token for API calls */}
                          <div className="flex items-center gap-1 px-2 pt-2 border-t border-dashed border-border mt-2">
                            <div className="w-1/4" />
                            <div className="w-1/4" />
                            <div className="w-2/4 relative">
                              <div className="h-px bg-primary w-full" style={{ strokeDasharray: '4 4' }} />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-primary border-y-[3px] border-y-transparent" />
                              <p className="text-[10px] text-center text-muted-foreground mt-1">
                                <span className="font-mono text-primary font-semibold">API calls</span> with <span className="font-mono">Authorization: Bearer &lt;token&gt;</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 1: Redirect */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                    <CardTitle className="text-lg">Redirect User to Authorization Page</CardTitle>
                  </div>
                  <CardDescription>Redirect the user's browser to our hosted consent page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeBlock>{`https://nocap.life/authorize?app_id=YOUR_APP_ID&redirect_uri=YOUR_CALLBACK_URL&scope=balance,charge&state=RANDOM_STRING`}</CodeBlock>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Query Parameters:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-4 font-semibold">Parameter</th>
                            <th className="text-left py-2 pr-4 font-semibold">Required</th>
                            <th className="text-left py-2 font-semibold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-4 font-mono text-xs text-primary">app_id</td>
                            <td className="py-2 pr-4">Yes</td>
                            <td className="py-2">Your application's UUID</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-4 font-mono text-xs text-primary">redirect_uri</td>
                            <td className="py-2 pr-4">Yes</td>
                            <td className="py-2">URL to redirect after authorization</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-4 font-mono text-xs text-primary">scope</td>
                            <td className="py-2 pr-4">No</td>
                            <td className="py-2">Comma-separated: <code className="font-mono">balance</code>, <code className="font-mono">charge</code>, <code className="font-mono">referral</code>, <code className="font-mono">topup</code>. Default: balance,charge</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-4 font-mono text-xs text-primary">state</td>
                            <td className="py-2 pr-4">Recommended</td>
                            <td className="py-2">Random string to prevent CSRF. Returned unchanged in callback</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The user will see a login screen (if not already signed in) followed by a consent screen showing the requested permissions. 
                    They can approve or deny your request.
                  </p>
                  <h4 className="text-sm font-semibold">Example (Node.js / Express):</h4>
                  <CodeBlock>{`app.get("/connect-nocap", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state; // Store for verification

  const params = new URLSearchParams({
    app_id: process.env.NOCAP_APP_ID,
    redirect_uri: "https://your-app.com/callback",
    scope: "balance,charge",
    state: state,
  });

  res.redirect(\`https://nocap.life/authorize?\${params}\`);
});`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 2: Receive Code */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                    <CardTitle className="text-lg">Receive Authorization Code</CardTitle>
                  </div>
                  <CardDescription>After the user approves, they are redirected back to your app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">On approval:</h4>
                    <CodeBlock>{`GET https://your-app.com/callback?code=AUTH_CODE_64_HEX_CHARS&state=YOUR_STATE`}</CodeBlock>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">On denial:</h4>
                    <CodeBlock>{`GET https://your-app.com/callback?error=access_denied&error_description=User+denied+the+request&state=YOUR_STATE`}</CodeBlock>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
                    <p className="text-xs text-destructive">
                      <strong>⚠️ Important:</strong> Authorization codes expire in <strong>10 minutes</strong> and can only be used <strong>once</strong>. 
                      Always verify the <code className="font-mono">state</code> parameter matches what you sent in Step 1.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3: Exchange Code */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                    <CardTitle className="text-lg">/api-token-exchange</CardTitle>
                  </div>
                  <CardDescription>Exchange the authorization code for a long-lived access token. This must be done server-side.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">code</code> (string, required): The authorization code from Step 2.</li>
                      <li><code className="text-primary font-bold">app_id</code> (string, required): Your application ID.</li>
                      <li><code className="text-primary font-bold">app_secret</code> (string, required): Your API secret.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-token-exchange" \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "auth_code_from_redirect",
    "app_id": "your-app-uuid",
    "app_secret": "your-api-secret"
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "success": true,
  "access_token": "a1b2c3d4e5f6...64_hex_chars",
  "token_type": "Bearer",
  "scopes": ["balance", "charge"],
  "expires_in": 7776000
}`}</CodeBlock>
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
                    <p className="text-xs text-destructive">
                      <strong>⚠️ Important:</strong> The <code className="font-mono">access_token</code> is shown only once. Store it securely on your server. 
                      Use it as the <code className="font-mono">Authorization: Bearer</code> header for all subsequent API calls.
                    </p>
                  </div>
                  <h4 className="text-sm font-semibold">Complete Callback Handler (Node.js):</h4>
                  <CodeBlock>{`app.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;

  // Check for denial
  if (error) return res.status(400).send("Authorization denied");

  // Verify state to prevent CSRF
  if (state !== req.session.oauthState) {
    return res.status(403).send("Invalid state parameter");
  }

  // Exchange code for access token
  const response = await fetch(
    "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-token-exchange",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        app_id: process.env.NOCAP_APP_ID,
        app_secret: process.env.NOCAP_APP_SECRET,
      }),
    }
  );

  const data = await response.json();
  if (data.success) {
    // Store access_token securely (e.g., database)
    await db.saveToken(req.user.id, data.access_token);
    res.redirect("/dashboard?connected=true");
  } else {
    res.status(400).send(data.error);
  }
});`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Using the Access Token */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Using the Access Token</CardTitle>
                  <CardDescription>How to make API calls after obtaining a token.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Once you have an access token, include it alongside your API credentials in every request:
                  </p>
                  <div className="p-4 bg-muted rounded-md space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><span className="font-mono font-bold text-primary">X-Api-Key</span></div>
                      <div className="text-muted-foreground">Your application's public key</div>
                      <div><span className="font-mono font-bold text-primary">X-Api-Secret</span></div>
                      <div className="text-muted-foreground">Your application's private secret</div>
                      <div><span className="font-mono font-bold text-primary">Authorization</span></div>
                      <div className="text-muted-foreground">Bearer &lt;access_token&gt; from token exchange</div>
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold">Example — Check User Balance:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-balance" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer access_token_from_exchange"`}</CodeBlock>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-4 rounded-md space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">🧪 Sandbox Shortcut: Skip the OAuth Flow</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      If your app is in <strong>Sandbox Mode</strong>, use the auto-generated <strong>Test Access Token</strong> instead. 
                      No need to implement the redirect flow during development.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Revoke */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-revoke</CardTitle>
                  </div>
                  <CardDescription>Revoke a user's access token, disconnecting your app from their wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Headers:</h4>
                    <p className="text-sm text-muted-foreground">The user's <code className="text-primary font-bold">Authorization</code> (session token). No API Key/Secret needed.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">token_id</code> (string, required): The ID of the access token to revoke.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-revoke" \\
  -H "Authorization: Bearer user_supabase_session_token" \\
  -H "Content-Type: application/json" \\
  -d '{ "token_id": "uuid-of-the-token" }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{ "success": true }`}</CodeBlock>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sandbox" forceMount className="data-[state=inactive]:hidden">
            <div className="space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Sandbox Testing Guide</CardTitle>
                  <CardDescription>A complete end-to-end walkthrough for testing your integration without real money.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Sandbox mode lets you build and test your entire payment integration in a safe environment. 
                    Transactions are simulated — no real funds move, charges complete instantly, and you get realistic API responses.
                  </p>
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-md">
                    <p className="text-xs text-primary font-semibold mb-1">✅ What's different in Sandbox?</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Charges are marked <strong>completed</strong> immediately (no pending state)</li>
                      <li>No wallet balance is deducted from users</li>
                      <li>Webhooks still fire with realistic payloads</li>
                      <li>A <strong>Test Access Token</strong> is auto-generated — no need to run the OAuth flow</li>
                      <li>All sandbox charges are flagged with <code className="font-mono text-primary">is_sandbox: true</code></li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Step 1 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 1 — Create a Sandbox App</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-2">
                    <li>Go to the <strong>Merchant Dashboard → API</strong> tab.</li>
                    <li>Click <strong>"Register New App"</strong>.</li>
                    <li>Toggle <strong>Sandbox Mode</strong> on.</li>
                    <li>Fill in the app name and optional description, then submit.</li>
                  </ol>
                  <p className="text-sm text-muted-foreground">
                    After creation you'll see a credentials dialog with your <strong>API Key</strong>, <strong>API Secret</strong>, and a <strong>Test Access Token</strong>. 
                    Copy all three — the secret is only shown once.
                  </p>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 2 — Set Your Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Store the credentials in your server environment. Here's an example using shell variables:
                  </p>
                  <CodeBlock>{`export API_KEY="your_api_key"
export API_SECRET="your_api_secret"
export TEST_TOKEN="your_test_access_token"`}</CodeBlock>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 rounded-md">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      💡 <strong>Tip:</strong> Need another token? Click <strong>"Generate Test Token"</strong> on the sandbox app card anytime.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 3 — Check Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Verify your credentials work by fetching the test user's balance:
                  </p>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-balance" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET" \\
  -H "Authorization: Bearer $TEST_TOKEN"`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Expected response:</p>
                  <CodeBlock>{`{
  "balance": 150.75,
  "currency": "MYR"
}`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 4 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 4 — Create a Test Charge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Create a charge. In sandbox mode it completes instantly:
                  </p>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET" \\
  -H "Authorization: Bearer $TEST_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5.00,
    "description": "Test order #1",
    "reference": "order_001",
    "metadata": { "item": "Widget", "qty": 2 }
  }'`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Expected response:</p>
                  <CodeBlock>{`{
  "success": true,
  "charge_id": "uuid-of-the-charge",
  "status": "completed",
  "is_sandbox": true
}`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 5 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 5 — Query Charge Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Verify the charge was recorded by querying its status:
                  </p>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge-status?charge_id=uuid-of-the-charge" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET"`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Expected response:</p>
                  <CodeBlock>{`{
  "charge_id": "uuid-of-the-charge",
  "amount": 5.00,
  "status": "completed",
  "is_sandbox": true,
  "reference": "order_001",
  "description": "Test order #1",
  "metadata": { "item": "Widget", "qty": 2 },
  "created_at": "2026-02-16T10:00:00Z",
  "completed_at": "2026-02-16T10:00:00Z"
}`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 6 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 6 — Test a Refund</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Issue a full or partial refund against the test charge:
                  </p>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-refund" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "charge_id": "uuid-of-the-charge",
    "amount": 2.50,
    "reason": "Partial refund test"
  }'`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 7 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 7 — List All Charges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Retrieve a paginated list of all sandbox charges to verify your test data:
                  </p>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charges-list?limit=10&status=completed" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET"`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 8 — Webhook Testing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 8 — Test Webhooks</CardTitle>
                  <CardDescription>Verify your server receives payment notifications correctly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">8a. Set your webhook URL</h4>
                    <p className="text-sm text-muted-foreground">
                      When registering or editing your sandbox app, set the <strong>Webhook URL</strong> field to your server endpoint. 
                      For local development, use a tunnel service like <strong>ngrok</strong> or <strong>localtunnel</strong>:
                    </p>
                    <CodeBlock>{`# Start a tunnel to your local server
ngrok http 3000

# Copy the HTTPS URL, e.g. https://abc123.ngrok.io
# Set it as your webhook URL in the Merchant Dashboard → API tab`}</CodeBlock>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">8b. Create a webhook handler</h4>
                    <p className="text-sm text-muted-foreground">
                      Your endpoint should accept POST requests and return a <code className="font-mono text-primary">200</code> status. Here's a minimal Node.js example:
                    </p>
                    <CodeBlock>{`// Express webhook handler
app.post("/webhook/nocap", (req, res) => {
  const event = req.body;

  console.log("Webhook received:", event.type);
  console.log("Charge ID:", event.charge_id);
  console.log("Amount:", event.amount);
  console.log("Status:", event.status);
  console.log("Sandbox:", event.is_sandbox);

  // TODO: Update your order status in your database

  res.status(200).json({ received: true });
});`}</CodeBlock>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">8c. Trigger a webhook</h4>
                    <p className="text-sm text-muted-foreground">
                      Create a sandbox charge (Step 4) — it completes instantly and fires a webhook to your URL:
                    </p>
                    <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET" \\
  -H "Authorization: Bearer $TEST_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 3.00, "description": "Webhook test", "reference": "wh_test_001" }'`}</CodeBlock>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">8d. Expected webhook payload</h4>
                    <p className="text-sm text-muted-foreground">
                      Your endpoint will receive a POST request with the following JSON body:
                    </p>
                    <CodeBlock>{`{
  "type": "charge.completed",
  "charge_id": "uuid-of-the-charge",
  "app_id": "uuid-of-your-app",
  "amount": 3.00,
  "status": "completed",
  "is_sandbox": true,
  "reference": "wh_test_001",
  "description": "Webhook test",
  "metadata": null,
  "transaction_id": "uuid-of-the-transaction",
  "completed_at": "2026-02-16T10:00:00Z"
}`}</CodeBlock>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-md">
                    <p className="text-xs text-primary font-semibold mb-1">💡 Debugging Tips</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Check your tunnel dashboard (e.g. <code className="font-mono">http://localhost:4040</code> for ngrok) to inspect raw requests</li>
                      <li>If your endpoint returns a non-200 status, the webhook will <strong>not</strong> retry in sandbox mode</li>
                      <li>Verify your server logs show the payload — if not, check the webhook URL is correct in your app settings</li>
                      <li>Sandbox webhooks have <code className="font-mono text-primary">is_sandbox: true</code> — use this flag to skip real order processing</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Going Live */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Going Live 🚀</CardTitle>
                  <CardDescription>When you're ready to accept real payments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-2">
                    <li>Create a <strong>new API app</strong> with Sandbox Mode <strong>off</strong>.</li>
                    <li>Replace your sandbox credentials with the new production <strong>API Key</strong> and <strong>API Secret</strong>.</li>
                    <li>Implement the <strong>OAuth 2.0 Authorization Code flow</strong> — redirect users to <code className="font-mono text-primary">/authorize</code>, then exchange the code via <code className="font-mono text-primary">/api-token-exchange</code>. See the <strong>Auth Flow</strong> tab for details.</li>
                    <li>Set up your <strong>webhook endpoint</strong> to receive payment notifications.</li>
                    <li>Test with a small real charge, then scale up.</li>
                  </ol>
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
                    <p className="text-xs text-destructive">
                      <strong>⚠️ Important:</strong> Production charges deduct real funds from user wallets. Double-check your amount calculations before going live.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="endpoints" forceMount className="data-[state=inactive]:hidden">
            <div className="space-y-6 pb-24">
              {/* v1.4 Commerce Extension Banner */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">v1.4</span>
                  <h3 className="text-sm font-bold">Commerce API Extension — Additive, no breaking changes</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Endpoints below marked <span className="font-bold text-primary">v1.4</span> add product, order, payment-link, and customer access for AI sales assistants (e.g. WhatsApp/Telegram bots).
                  All v1.3 endpoints, request shapes, response envelopes, webhook payloads, and the OAuth flow remain <strong>unchanged</strong>.
                  v1.4 endpoints use a new server-to-server auth header pair: <code className="font-mono">X-Api-Key</code> + <code className="font-mono">X-Api-Secret</code> only (no user Bearer token required).
                </p>
              </div>

              {/* v1.4 — GET /api-products */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-products</CardTitle>
                    <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">v1.4</span>
                  </div>
                  <CardDescription>List, search, or fetch detail for the merchant's marketplace products.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Query Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">id</code> (uuid, optional): Return a single product with its variants.</li>
                      <li><code className="text-primary font-bold">search</code> (string, optional): Full-text / partial match on name + description.</li>
                      <li><code className="text-primary font-bold">status</code> (string, optional): Defaults to <code>active</code>. Use <code>draft</code> or <code>archived</code> to inspect non-public items.</li>
                      <li><code className="text-primary font-bold">page</code> / <code className="text-primary font-bold">limit</code>: Pagination (limit max 100, default 20).</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-products?search=hijab&limit=5" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example (list):</h4>
                  <CodeBlock>{`{
  "data": [
    {
      "id": "uuid",
      "store_id": "uuid",
      "name": "Premium Hijab",
      "price": 49.90,
      "stock_quantity": 25,
      "status": "active",
      "images": ["https://..."],
      "sold_count": 142
    }
  ],
  "page": 1,
  "limit": 5,
  "total": 1
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-products"
                    params={[
                      { name: "id", placeholder: "uuid (optional)", type: "query" },
                      { name: "search", placeholder: "search term", type: "query" },
                      { name: "status", placeholder: "active", type: "query" },
                      { name: "page", placeholder: "1", type: "query" },
                      { name: "limit", placeholder: "20", type: "query" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>

              {/* v1.4 — GET /api-orders */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-orders</CardTitle>
                    <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">v1.4</span>
                  </div>
                  <CardDescription>List or fetch detail for marketplace orders belonging to the merchant.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Query Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">id</code> (uuid, optional): Return one order with line items and status history.</li>
                      <li><code className="text-primary font-bold">status</code>: e.g. <code>pending</code>, <code>paid</code>, <code>shipped</code>, <code>delivered</code>, <code>cancelled</code>.</li>
                      <li><code className="text-primary font-bold">customer_phone</code>: Exact match on buyer phone (E.164 recommended).</li>
                      <li><code className="text-primary font-bold">from</code> / <code className="text-primary font-bold">to</code>: ISO 8601 date range on <code>created_at</code>.</li>
                      <li><code className="text-primary font-bold">page</code> / <code className="text-primary font-bold">limit</code>: Pagination (limit max 100, default 20).</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-orders?status=paid&limit=10" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}</CodeBlock>
                  <h4 className="text-sm font-semibold mt-4">POST /api-orders — create draft order</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-orders" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "store_id": "uuid",
    "buyer_name": "Ali",
    "buyer_phone": "+60123456789",
    "buyer_email": "ali@example.com",
    "shipping_address": "12 Jalan ABC, KL",
    "shipping_fee": 8,
    "items": [{ "product_id": "uuid", "quantity": 2 }],
    "create_payment_link": true
  }'`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Returns the order, line items, and (if requested) a hosted <code>payment_link</code> at <code>/pay/&lt;link_id&gt;</code>. Fires <code>order.created</code> webhook.</p>

                  <h4 className="text-sm font-semibold mt-4">PATCH /api-orders?id=… — update fulfillment</h4>
                  <CodeBlock>{`curl -X PATCH "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-orders?id=ORDER_UUID" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "shipped", "tracking_number": "PL123456789MY" }'`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Allowed status transitions: <code>draft</code>, <code>pending</code>, <code>confirmed</code>, <code>shipped</code>, <code>delivered</code>, <code>cancelled</code>, <code>refunded</code>. Each transition fires <code>order.&lt;status&gt;</code>.</p>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-orders"
                    params={[
                      { name: "id", placeholder: "uuid (optional)", type: "query" },
                      { name: "status", placeholder: "paid", type: "query" },
                      { name: "customer_phone", placeholder: "+60123456789", type: "query" },
                      { name: "from", placeholder: "2026-01-01", type: "query" },
                      { name: "to", placeholder: "2026-12-31", type: "query" },
                      { name: "page", placeholder: "1", type: "query" },
                      { name: "limit", placeholder: "20", type: "query" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>

              {/* v1.4 — POST /api-payment-links */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-payment-links</CardTitle>
                    <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">v1.4</span>
                  </div>
                  <CardDescription>Hosted checkout link. Buyer pays at <code>/pay/&lt;link_id&gt;</code> on nocap.life — PIN never leaves Nocap.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-payment-links" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 49.90, "description": "Order ORD-XYZ", "expires_in_seconds": 86400 }'`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Lifecycle webhooks: <code>payment_link.paid</code>, <code>payment_link.expired</code>.</p>
                </CardContent>
              </Card>

              {/* v1.4 — Webhook events catalog */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">v1.4 webhook events <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold ml-2">v1.4</span></CardTitle>
                  <CardDescription>Additive. Same HMAC-SHA256 signing as v1.3 <code>charge.*</code>; envelope adds <code>merchant_id</code> + <code>branch_id</code>.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="font-semibold">Orders:</span> <code className="text-xs">order.created · order.confirmed · order.shipped · order.delivered · order.cancelled · order.refunded</code></p>
                  <p><span className="font-semibold">Payment links:</span> <code className="text-xs">payment_link.paid · payment_link.expired</code></p>
                  <p><span className="font-semibold">Products:</span> <code className="text-xs">product.created · product.updated · product.stock_changed</code></p>
                </CardContent>
              </Card>

              {/* v1.4 — GET /api-customers */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-customers</CardTitle>
                    <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">v1.4</span>
                  </div>
                  <CardDescription>Merchant-scoped customer directory. Filter by <code>?phone=</code> or <code>?email=</code>; <code>?id=&lt;uuid&gt;</code> returns one customer; <code>?id=&lt;uuid&gt;&amp;orders=true</code> appends order history.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeBlock>{`# List + search
curl "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-customers?phone=%2B60123456789" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"

# Customer detail with order history
curl "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-customers?id=<uuid>&orders=true" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Only customers who have ordered from a store owned by the authenticated merchant are returned.</p>
                </CardContent>
              </Card>

              {/* v1.4 — POST /api-inventory/reserve */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-inventory/reserve</CardTitle>
                    <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">v1.4</span>
                  </div>
                  <CardDescription>Soft hold on stock with a TTL (default 900s, max 3600s). Does NOT decrement <code>stock_quantity</code>; effective availability = stock − Σ active reservations. Idempotent per <code>(api_key, reference)</code>.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-inventory/reserve" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product_id": "uuid",
    "variant_id": "uuid-or-omit",
    "quantity": 2,
    "ttl_seconds": 900,
    "reference": "cart_abc123"
  }'`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Returns <code>409 Insufficient stock</code> with <code>available</code> + <code>requested</code> when the hold cannot be granted. On success returns the reservation row + <code>available_after</code>.</p>
                </CardContent>
              </Card>

              {/* v1.4 — POST /api-inventory/release */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-inventory/release</CardTitle>
                    <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">v1.4</span>
                  </div>
                  <CardDescription>Release a hold early. Pass <code>reservation_id</code> or the original <code>reference</code>. Idempotent — already-released/expired holds return 200.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-inventory/release" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{ "reference": "cart_abc123" }'`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Holds also auto-expire when <code>expires_at</code> passes — no explicit release required if you're OK waiting.</p>
                </CardContent>
              </Card>

              {/* v1.4 — Webhook subscriptions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-webhooks/subscriptions</CardTitle>
                    <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">v1.4</span>
                  </div>
                  <CardDescription>Manage per-event webhook opt-in and the delivery URL for the calling app. <code>subscriptions: null</code> = subscribe to all (v1.3-compatible default).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold mb-1">View current config & event catalog</p>
                    <CodeBlock>{`curl "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-webhooks/subscriptions" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"

# Sample response (subscribed to all — default)
{
  "app_id": "f6e5...",
  "webhook_url": "https://yourapp.com/webhooks/nocap",
  "subscriptions": null,
  "subscribed_to_all": true,
  "available_events": [
    "charge.completed", "charge.failed", "charge.refunded",
    "order.created", "order.paid", "order.shipped", "order.delivered", "order.cancelled",
    "product.stock_changed",
    "payment_link.paid", "payment_link.expired"
  ]
}`}</CodeBlock>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-1">Subscribe to specific events only</p>
                    <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-webhooks/subscriptions" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_url": "https://yourapp.com/webhooks/nocap",
    "subscriptions": ["order.paid", "order.shipped", "payment_link.paid"]
  }'`}</CodeBlock>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-1">Subscribe to ALL events (v1.3-compatible default)</p>
                    <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-webhooks/subscriptions" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{ "subscriptions": null }'`}</CodeBlock>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Use <code>null</code> for "all events". An empty array <code>[]</code> means "no events" (pauses deliveries without removing the URL).
                    </p>
                  </div>

                  <div className="rounded-md border border-border p-3 text-xs space-y-1">
                    <p className="font-semibold">subscriptions value reference</p>
                    <p><code>null</code> → Subscribe to all events (default)</p>
                    <p><code>["order.paid", "order.shipped"]</code> → Receive only those events</p>
                    <p><code>[]</code> → Pause — no events delivered</p>
                    <p>omitted from POST → Preserve existing setting</p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Branch-scoped apps only receive events for their branch; merchant-level apps receive all events for the merchant. Unknown event names return <code>400</code> with the full <code>available_events</code> list.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-balance</CardTitle>
                  </div>
                  <CardDescription>Retrieve the authenticated user's current wallet balance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-balance" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "balance": 150.75,
  "currency": "MYR"
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-balance"
                    params={[]}
                    needsUserToken={true}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-charge</CardTitle>
                  </div>
                  <CardDescription>Initiate a payment from the user's wallet to your merchant branch.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">amount</code> (number, required): The payment amount.</li>
                      <li><code className="text-primary font-bold">description</code> (string, optional): A brief description of the charge.</li>
                      <li><code className="text-primary font-bold">reference</code> (string, optional): Your internal transaction reference ID.</li>
                      <li><code className="text-primary font-bold">branch_id</code> (string, conditional): Target branch UUID. <strong>Required</strong> for merchant-level apps (no default branch). Optional for branch-level apps (defaults to the app's branch). Use <code className="font-mono">/api-branches</code> to list available branches.</li>
                      <li><code className="text-primary font-bold">metadata</code> (object, optional): Custom key-value data (max 4KB). Returned in webhooks and charge queries.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10.50,
    "description": "Order #12345",
    "reference": "txn_88291",
    "metadata": { "order_id": "ORD-123", "customer_email": "user@example.com" }
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "success": true,
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.50,
  "new_balance": 140.25,
  "cashback": 0.09,
  "branch_name": "My Store"
}`}</CodeBlock>
                  <ApiTryIt
                    method="POST"
                    endpoint="api-charge"
                    params={[]}
                    bodyFields={[
                      { name: "amount", placeholder: "10.50", type: "number", required: true },
                      { name: "description", placeholder: "Order #12345", type: "string" },
                      { name: "reference", placeholder: "txn_88291", type: "string" },
                      { name: "branch_id", placeholder: "uuid-of-branch (required for merchant-level apps)", type: "string" },
                      { name: "metadata", placeholder: '{ "order_id": "ORD-123" }', type: "json" },
                    ]}
                    needsUserToken={true}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-charge-status</CardTitle>
                  </div>
                  <CardDescription>Check the status of a specific charge request.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold mb-2">Query Parameters:</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <code className="text-primary font-bold">charge_id</code> (string, required): The ID of the charge returned by the /api-charge endpoint.
                  </p>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge-status?charge_id=uuid" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "completed",
  "transaction_id": "uuid",
  "created_at": "2026-02-16T12:00:00.000Z",
  "completed_at": "2026-02-16T12:00:01.000Z"
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-charge-status"
                    params={[
                      { name: "charge_id", placeholder: "uuid-of-the-charge", required: true, type: "query" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-refund</CardTitle>
                  </div>
                  <CardDescription>Issue a full or partial refund for a completed charge. Funds are returned from the branch wallet to the member's wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Headers:</h4>
                    <p className="text-sm text-muted-foreground">Only <code className="text-primary font-bold">X-Api-Key</code> and <code className="text-primary font-bold">X-Api-Secret</code> are required. No user access token needed — the merchant initiates refunds.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">charge_id</code> (string, required): The charge ID to refund.</li>
                      <li><code className="text-primary font-bold">amount</code> (number, optional): Partial refund amount. Omit for full refund.</li>
                      <li><code className="text-primary font-bold">reason</code> (string, optional): Reason for the refund.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold mb-2">Request Example:</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-refund" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -d '{
    "charge_id": "uuid-of-the-charge",
    "amount": 5.00,
    "reason": "Customer returned item"
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold mb-2">Response Example:</h4>
                  <CodeBlock>{`{
  "success": true,
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.50,
  "status": "partial_refund",
  "transaction_id": "uuid"
}`}</CodeBlock>
                  <ApiTryIt
                    method="POST"
                    endpoint="api-refund"
                    params={[]}
                    bodyFields={[
                      { name: "charge_id", placeholder: "uuid-of-the-charge", type: "string", required: true },
                      { name: "amount", placeholder: "5.00", type: "number" },
                      { name: "reason", placeholder: "Customer returned item", type: "string" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-charges-list</CardTitle>
                  </div>
                  <CardDescription>Retrieve a paginated list of charges for your API app with optional filters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Query Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">page</code> (number, optional): Page number. Default: 1.</li>
                      <li><code className="text-primary font-bold">limit</code> (number, optional): Items per page (1–100). Default: 20.</li>
                      <li><code className="text-primary font-bold">status</code> (string, optional): Filter by status (pending, completed, failed, refunded, partial_refund).</li>
                      <li><code className="text-primary font-bold">from</code> (string, optional): ISO 8601 date. Only charges created on or after this date.</li>
                      <li><code className="text-primary font-bold">to</code> (string, optional): ISO 8601 date. Only charges created on or before this date.</li>
                      <li><code className="text-primary font-bold">reference</code> (string, optional): Filter by your internal reference ID.</li>
                      <li><code className="text-primary font-bold">user_id</code> (string, optional): Filter by a specific user's charges.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charges-list?page=1&limit=10&status=completed" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "data": [
    {
      "id": "uuid",
      "amount": 10.50,
      "description": "Order #12345",
      "reference": "txn_88291",
      "status": "completed",
      "is_sandbox": false,
      "transaction_id": "uuid",
      "user_id": "uuid",
      "created_at": "2026-02-16T12:00:00.000Z",
      "completed_at": "2026-02-16T12:00:01.000Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "total_pages": 5,
    "has_more": true
  }
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-charges-list"
                    params={[
                      { name: "page", placeholder: "1", type: "query" },
                      { name: "limit", placeholder: "20", type: "query" },
                      { name: "status", placeholder: "completed", type: "query" },
                      { name: "from", placeholder: "2026-01-01", type: "query" },
                      { name: "to", placeholder: "2026-12-31", type: "query" },
                      { name: "reference", placeholder: "txn_88291", type: "query" },
                      { name: "user_id", placeholder: "uuid", type: "query" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>

              {/* Branch Management Endpoint */}
              <div className="pt-4">
                <h2 className="text-xl font-bold mb-1">Branch Management</h2>
                <p className="text-sm text-muted-foreground mb-4">List available branches for merchant-level API apps. Auth via <code className="text-primary font-bold">x-api-key</code> + <code className="text-primary font-bold">x-api-secret</code> only (no Bearer token needed).</p>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-branches</CardTitle>
                  </div>
                  <CardDescription>List all active branches for the merchant who owns the API app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-branches" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "branches": [
    {
      "id": "uuid",
      "branch_name": "KL Sentral Outlet",
      "qr_code_id": "abc123",
      "is_active": true
    },
    {
      "id": "uuid",
      "branch_name": "Pavilion Outlet",
      "qr_code_id": "def456",
      "is_active": true
    }
  ]
}`}</CodeBlock>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 rounded-md">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      💡 <strong>Tip:</strong> Use this endpoint to populate your branch selector or to map your internal outlet IDs to NoCap branch IDs. Required for merchant-level apps when calling <code className="font-mono">/api-charge</code>.
                    </p>
                  </div>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-branches"
                    params={[]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>

              {/* App Info (public) */}
              <div className="pt-4">
                <h2 className="text-xl font-bold mb-1">App Metadata (Public)</h2>
                <p className="text-sm text-muted-foreground mb-4">Look up an API app's display name from its <code className="text-primary font-bold">app_id</code>. Public — no authentication required. Useful for rendering app branding on custom OAuth consent screens.</p>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-app-info</CardTitle>
                  </div>
                  <CardDescription>Resolve an app's public name from its <code className="font-mono">app_id</code> (UUID) or <code className="font-mono">api_key</code>.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold">Query Parameters:</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                    <li><code className="text-primary font-bold">app_id</code> (string, required): The app's UUID, or its <code className="font-mono">api_key</code> as a fallback.</li>
                  </ul>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-app-info?app_id=YOUR_APP_ID"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "id": "11111111-2222-3333-4444-555555555555",
  "name": "Acme POS"
}`}</CodeBlock>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 rounded-md">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      🔓 <strong>Public endpoint:</strong> No <code className="font-mono">x-api-key</code> or Bearer token required. Returns <code className="font-mono">404</code> if the app does not exist or is inactive. Only the <code className="font-mono">id</code> and <code className="font-mono">name</code> fields are returned — no secrets are ever exposed.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="pt-4">
                <h2 className="text-xl font-bold mb-1">Wallet Top-Up</h2>
                <p className="text-sm text-muted-foreground mb-4">Allow users to top up their NoCap wallet via FPX bank transfer. Requires the <code className="text-primary font-bold">topup</code> OAuth scope.</p>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-topup</CardTitle>
                  </div>
                  <CardDescription>Initiate a wallet top-up for the authenticated user. Returns a payment URL for FPX bank transfer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">amount</code> (number, required): Top-up amount. Min: RM10, Max: RM500.</li>
                      <li><code className="text-primary font-bold">description</code> (string, optional): A brief description for the top-up.</li>
                      <li><code className="text-primary font-bold">reference</code> (string, optional): Your internal reference ID for idempotency. Duplicate references are rejected.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-topup" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50.00,
    "description": "Wallet reload",
    "reference": "topup_001"
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "success": true,
  "payment_url": "https://cloud.raudhahpay.com/payment/...",
  "transaction_id": "uuid",
  "bill_code": "BILL-123",
  "amount": 50.00
}`}</CodeBlock>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-4 rounded-md space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">💡 How it works</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Open <code className="font-mono font-bold">payment_url</code> in the user's browser or webview. After successful FPX payment, the wallet is credited automatically via webhook. 
                      Your app will receive a <code className="font-mono font-bold">topup.completed</code> or <code className="font-mono font-bold">topup.failed</code> webhook event.
                    </p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-md">
                    <p className="text-xs text-primary font-semibold mb-1">🧪 Sandbox Mode</p>
                    <p className="text-xs text-muted-foreground">
                      In sandbox mode, the top-up completes immediately without creating a real payment bill. The wallet is credited instantly and a mock <code className="font-mono">payment_url</code> is returned.
                    </p>
                  </div>
                  <h4 className="text-sm font-semibold">Error Responses:</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">400 Bad Request — Invalid amount</p>
                      <CodeBlock>{`{
  "error": "Amount must be between RM 10.00 and RM 500.00"
}`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">401 Unauthorized — Missing or invalid credentials</p>
                      <CodeBlock>{`{
  "error": "Missing or invalid API key"
}`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">403 Forbidden — Token lacks topup scope</p>
                      <CodeBlock>{`{
  "error": "Access token does not have the required scope: topup"
}`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">409 Conflict — Duplicate reference</p>
                      <CodeBlock>{`{
  "error": "A top-up with this reference already exists",
  "code": "DUPLICATE_REFERENCE",
  "existing_transaction_id": "uuid"
}`}</CodeBlock>
                    </div>
                  </div>
                  <ApiTryIt
                    method="POST"
                    endpoint="api-topup"
                    params={[]}
                    bodyFields={[
                      { name: "amount", placeholder: "50.00", type: "number", required: true },
                      { name: "description", placeholder: "Wallet reload", type: "string" },
                      { name: "reference", placeholder: "topup_001", type: "string" },
                    ]}
                    needsUserToken={true}
                  />
                </CardContent>
              </Card>

              {/* Referral / Affiliate Endpoints */}
              <div className="pt-4">
                <h2 className="text-xl font-bold mb-1">Referral / Affiliate Endpoints</h2>
                <p className="text-sm text-muted-foreground mb-4">These endpoints require the <code className="text-primary font-bold">referral</code> OAuth scope. Existing connected users must re-authorize with <code className="font-mono text-xs">scope=balance,charge,referral</code>.</p>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-referral-info</CardTitle>
                  </div>
                  <CardDescription>Get the authenticated user's referral code, sharing link, and referral stats.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-info" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "referral_code": "A1B2C3D4",
  "referral_link": "https://nocap.life/auth?ref=A1B2C3D4",
  "stats": {
    "direct_referrals": 5,
    "network_size": 12,
    "total_cashback": 15.50,
    "total_commission": 32.00
  }
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-referral-info"
                    params={[]}
                    needsUserToken={true}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-referral-register</CardTitle>
                  </div>
                  <CardDescription>Register a new NoCap user via API, automatically linked by referral code. No bearer token needed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">email</code> (string, required): New user's email address.</li>
                      <li><code className="text-primary font-bold">referral_code</code> (string, required): The referrer's referral code.</li>
                      <li><code className="text-primary font-bold">full_name</code> (string, optional): User's display name.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-register" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "newuser@example.com",
    "referral_code": "A1B2C3D4",
    "full_name": "Ahmad Bin Ali"
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Success Response (201 Created):</h4>
                  <CodeBlock>{`{
  "success": true,
  "user_id": "uuid",
  "referral_code": "X9Y8Z7W6",
  "access_token": "64-char-hex-string",
  "scopes": ["balance", "charge", "referral"],
  "message": "User registered and connected"
}`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Conflict Response (409 — User Already Exists):</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Returned when the email is already registered in NoCap. Use these fields to decide your next step.
                  </p>
                  <CodeBlock>{`{
  "error": "User with this email already exists.",
  "code": "USER_EXISTS",
  "user_id": "uuid",
  "has_referral": true,
  "referral_code": "A1B2C3D4",
  "has_wallet_pin": true,
  "already_connected": false,
  "action": "Use the OAuth authorization flow to connect this existing user's wallet to your app."
}`}</CodeBlock>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-semibold">Field</th>
                          <th className="text-left py-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">code</td>
                          <td className="py-2 text-xs">Always <code className="text-primary font-bold">"USER_EXISTS"</code> for this scenario.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">user_id</td>
                          <td className="py-2 text-xs">The existing NoCap user's UUID.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">has_referral</td>
                          <td className="py-2 text-xs">Whether the user was already referred by someone (<code className="font-bold">true</code>/<code className="font-bold">false</code>).</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">referral_code</td>
                          <td className="py-2 text-xs">The user's own referral code (for sharing with others).</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">has_wallet_pin</td>
                          <td className="py-2 text-xs">Whether the user has set up a wallet PIN.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">already_connected</td>
                          <td className="py-2 text-xs">Whether the user already has an active access token for your app. If <code className="font-bold">true</code>, no further action needed.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">action</td>
                          <td className="py-2 text-xs">Human-readable guidance on the next step for your integration.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 p-4 rounded-md">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>💡 Handling 409 in your signup flow:</strong> If <code className="font-bold">already_connected</code> is <code className="font-bold">true</code>, skip — the user is fully linked. 
                      If <code className="font-bold">false</code>, redirect the user to the OAuth authorization flow (Prompt 3) after they log in to your dashboard, so they can connect their existing wallet.
                    </p>
                  </div>
                  <ApiTryIt
                    method="POST"
                    endpoint="api-referral-register"
                    params={[]}
                    bodyFields={[
                      { name: "email", placeholder: "newuser@example.com", type: "string", required: true },
                      { name: "referral_code", placeholder: "A1B2C3D4", type: "string", required: true },
                      { name: "full_name", placeholder: "Ahmad Bin Ali", type: "string" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-referral-network</CardTitle>
                  </div>
                  <CardDescription>Get the user's multi-tier referral tree (Tiers 1–5).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-network" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "tiers": [
    {
      "tier": 1,
      "count": 3,
      "members": [
        { "name": "Ahmad", "joined": "2026-02-23T10:00:00Z" }
      ]
    },
    { "tier": 2, "count": 5, "members": [...] }
  ]
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-referral-network"
                    params={[]}
                    needsUserToken={true}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-cashback-history</CardTitle>
                  </div>
                  <CardDescription>Get paginated cashback and commission transaction history.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Query Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">page</code> (number, optional): Page number. Default: 1.</li>
                      <li><code className="text-primary font-bold">limit</code> (number, optional): Items per page (1–100). Default: 20.</li>
                      <li><code className="text-primary font-bold">type</code> (string, optional): Filter by "cashback" or "commission".</li>
                      <li><code className="text-primary font-bold">from</code> (string, optional): ISO date range start.</li>
                      <li><code className="text-primary font-bold">to</code> (string, optional): ISO date range end.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-cashback-history?page=1&limit=10" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "transactions": [
    { "type": "cashback", "amount": 1.50, "description": "Cashback from payment", "created_at": "2026-02-20T10:00:00Z" },
    { "type": "commission", "amount": 0.80, "description": "Tier 1 commission", "created_at": "2026-02-19T14:30:00Z" }
  ],
  "totals": { "cashback": 15.50, "commission": 32.00 },
  "pagination": { "page": 1, "limit": 10, "total": 25, "total_pages": 3, "has_more": true }
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-cashback-history"
                    params={[
                      { name: "page", placeholder: "1", type: "query" },
                      { name: "limit", placeholder: "20", type: "query" },
                      { name: "type", placeholder: "cashback", type: "query" },
                      { name: "from", placeholder: "2026-01-01", type: "query" },
                      { name: "to", placeholder: "2026-12-31", type: "query" },
                    ]}
                    needsUserToken={true}
                  />
                </CardContent>
              </Card>

              {/* Payment Flow Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💡 Payment Flow Comparison: NoCap Wallet vs Cash/Card</CardTitle>
                  <CardDescription>Understand how cashback and commission distribution works for different payment methods.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Side-by-side flows */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Path A: NoCap Wallet */}
                    <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded">PATH A</span>
                        <h4 className="text-sm font-bold">Customer Pays with NoCap Wallet</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Uses QR scan → <code className="font-mono text-[10px]">process-payment</code> or <code className="font-mono text-[10px]">/api-charge</code></p>
                      <div className="space-y-2">
                        {[
                          { step: '1', label: 'Customer scans QR / app charges wallet', icon: '📱' },
                          { step: '2', label: 'Funds deducted from customer\'s NoCap wallet', icon: '💳' },
                          { step: '3', label: '1% platform fee deducted', icon: '🏦' },
                          { step: '4', label: 'Net amount credited to branch wallet', icon: '✅' },
                          { step: '5', label: 'Commission pool auto-distributed (cashback + tiers)', icon: '🎁' },
                        ].map(s => (
                          <div key={s.step} className="flex items-start gap-2">
                            <span className="text-xs mt-0.5">{s.icon}</span>
                            <div>
                              <span className="text-[10px] font-bold text-primary">Step {s.step}</span>
                              <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-background/80 rounded p-2 mt-2 space-y-1">
                        <p className="text-[10px] font-semibold">Example: RM100 sale (5% commission)</p>
                        <p className="text-[10px] text-muted-foreground">Platform fee: RM1.00 → Branch receives: RM99.00</p>
                        <p className="text-[10px] text-muted-foreground">Commission pool: RM5.00 → Cashback: RM0.83 × 1 + Tiers: RM0.83 × 5</p>
                        <p className="text-[10px] font-medium text-green-600 dark:text-green-400">Customer gets: RM0.83 cashback in NoCap wallet</p>
                      </div>
                    </div>

                    {/* Path D: Cash/Card via api-distribute */}
                    <div className="border border-orange-500/30 rounded-lg p-4 space-y-3 bg-orange-500/5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold rounded">PATH D</span>
                        <h4 className="text-sm font-bold">Customer Pays with Cash/Card</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">3rd party calls <code className="font-mono text-[10px]">/api-distribute</code> after sale</p>
                      <div className="space-y-2">
                        {[
                          { step: '1', label: 'Customer pays with cash/card at 3rd party POS', icon: '💵' },
                          { step: '2', label: 'If no NoCap account → call /api-referral-register to auto-create', icon: '🔗' },
                          { step: '3', label: 'Staff marks order "completed"', icon: '✅' },
                          { step: '4', label: '3rd party calls /api-distribute with referral code + amount', icon: '📡' },
                          { step: '5', label: 'Branch wallet debited, cashback + tiers credited (same formula)', icon: '🎁' },
                        ].map(s => (
                          <div key={s.step} className="flex items-start gap-2">
                            <span className="text-xs mt-0.5">{s.icon}</span>
                            <div>
                              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">Step {s.step}</span>
                              <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-background/80 rounded p-2 mt-2 space-y-1">
                        <p className="text-[10px] font-semibold">Example: RM100 sale (5% commission)</p>
                        <p className="text-[10px] text-muted-foreground">No platform fee → Branch debited: RM2.49</p>
                        <p className="text-[10px] text-muted-foreground">Commission pool: RM5.00 → Cashback: RM0.83 × 1 + Tiers: RM0.83 × 5</p>
                        <p className="text-[10px] font-medium text-green-600 dark:text-green-400">Customer gets: RM0.83 cashback in NoCap wallet</p>
                      </div>
                    </div>
                  </div>

                  {/* Key differences table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-border rounded">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-2 border-b border-border">Aspect</th>
                          <th className="text-left p-2 border-b border-border">NoCap Wallet (QR)</th>
                          <th className="text-left p-2 border-b border-border">Cash/Card (api-distribute)</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50">
                          <td className="p-2 font-medium text-foreground">Source of funds</td>
                          <td className="p-2">Customer's NoCap wallet</td>
                          <td className="p-2">Branch wallet (debited)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="p-2 font-medium text-foreground">Platform fee</td>
                          <td className="p-2">Yes (1%)</td>
                          <td className="p-2">No (collected at POS)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="p-2 font-medium text-foreground">Negative balance</td>
                          <td className="p-2">Not allowed</td>
                          <td className="p-2">Allowed ✅</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="p-2 font-medium text-foreground">Trigger</td>
                          <td className="p-2">Customer scans QR</td>
                          <td className="p-2">API call from 3rd party</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="p-2 font-medium text-foreground">NoCap account needed?</td>
                          <td className="p-2">Yes (to pay)</td>
                          <td className="p-2">Yes (auto-created via api-referral-register)</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium text-foreground">Cashback amount</td>
                          <td className="p-2 font-medium text-green-600 dark:text-green-400">Same ✅</td>
                          <td className="p-2 font-medium text-green-600 dark:text-green-400">Same ✅</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Important note about auto-registration */}
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 p-4 rounded-md space-y-2">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-200">✅ Cash/Card customers get the SAME cashback</p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Customers don't need to pay with NoCap wallet. They just need a NoCap <strong>account</strong> to receive cashback into. 
                      Your system can auto-create accounts using <code className="font-mono font-bold">/api-referral-register</code> — 
                      the customer only needs a phone number and email. No manual signup required.
                    </p>
                  </div>

                  {/* Integration flow for cash/card */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-bold">Recommended Integration Flow (Cash/Card)</h4>
                    <div className="flex flex-col gap-1">
                      {[
                        { code: '1', text: 'Customer places order and pays with cash/card at your POS' },
                        { code: '2', text: 'Check if customer has a NoCap referral code in your system' },
                        { code: '3', text: 'If NO → POST /api-referral-register (email, phone, referrer code) → get referral_code back' },
                        { code: '4', text: 'Staff processes and marks order as "completed"' },
                        { code: '5', text: 'POST /api-distribute (branch_id, member_referral_code, amount, reference)' },
                        { code: '6', text: 'Customer receives cashback in their NoCap wallet automatically' },
                      ].map(s => (
                        <div key={s.code} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">{s.code}</span>
                          <p className="text-xs text-muted-foreground">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-distribute</CardTitle>
                  </div>
                  <CardDescription>Trigger cashback &amp; commission distribution from a 3rd-party sale. Funds are deducted from the branch wallet (negative balance allowed).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 p-4 rounded-md">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>💡 How it works:</strong> When a sale happens in your 3rd-party system, call this endpoint to distribute cashback to the member and tier commissions to their referral ancestors. The commission pool is calculated using the branch's <code className="font-mono font-bold">commission_percent</code> setting.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">branch_id</code> (uuid, required): The branch where the sale occurred.</li>
                      <li><code className="text-primary font-bold">member_referral_code</code> (string): Referral code of the member. Either this or <code>user_id</code> is required.</li>
                      <li><code className="text-primary font-bold">user_id</code> (uuid): NoCap user ID of the member. Either this or <code>member_referral_code</code> is required.</li>
                      <li><code className="text-primary font-bold">amount</code> (number, required): Sale amount in MYR (0.01–500,000).</li>
                      <li><code className="text-primary font-bold">reference</code> (string, optional): Idempotency key to prevent duplicate distributions.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-distribute" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "branch_id": "uuid-of-branch",
    "member_referral_code": "D3123F95",
    "amount": 100.00,
    "reference": "sale-12345"
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "success": true,
  "distribution_id": "uuid",
  "breakdown": {
    "sale_amount": 100.00,
    "commission_percent": 5,
    "total_pool": 5.00,
    "cashback": 0.83,
    "tier_commissions": [
      { "tier": 1, "amount": 0.83, "user_id": "uuid" },
      { "tier": 2, "amount": 0.83, "user_id": "uuid" }
    ],
    "unclaimed_returned": 2.51,
    "branch_debited": 2.49
  }
}`}</CodeBlock>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-4 rounded-md space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">⚠️ Negative Balance</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Unlike QR payments, this endpoint allows the branch wallet to go negative. This ensures distributions always succeed even if the branch hasn't accumulated enough sales balance yet.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Webhook Event:</h4>
                    <p className="text-sm text-muted-foreground">
                      A <code className="text-primary font-bold">distribution.completed</code> webhook is fired to your configured webhook URL after a successful distribution.
                    </p>
                  </div>
                  <ApiTryIt
                    method="POST"
                    endpoint="api-distribute"
                    params={[]}
                    bodyFields={[
                      { name: "branch_id", placeholder: "uuid-of-branch", type: "string", required: true },
                      { name: "member_referral_code", placeholder: "D3123F95", type: "string" },
                      { name: "user_id", placeholder: "uuid-of-member (alternative)", type: "string" },
                      { name: "amount", placeholder: "100.00", type: "number", required: true },
                      { name: "reference", placeholder: "sale-12345", type: "string" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="webhooks" forceMount className="data-[state=inactive]:hidden">
            <div className="space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>Receive real-time notifications for payment events at your configured webhook URL.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Setup</h3>
                    <p className="text-sm text-muted-foreground">
                      Set a <strong>Webhook URL</strong> when registering your API application in the Merchant Dashboard.
                      We will send a <code className="text-primary font-bold">POST</code> request with a JSON payload to this URL whenever a payment event occurs.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Events</h3>
                    <div className="p-4 bg-muted rounded-md space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <code className="text-primary font-bold whitespace-nowrap">charge.completed</code>
                        <span className="text-muted-foreground">Sent when a charge is successfully processed.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <code className="text-destructive font-bold whitespace-nowrap">charge.failed</code>
                        <span className="text-muted-foreground">Sent when a charge fails (insufficient balance, PIN errors, etc.).</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <code className="text-primary font-bold whitespace-nowrap">charge.partial_refund</code>
                        <span className="text-muted-foreground">Sent when a partial refund is issued for a charge.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <code className="text-primary font-bold whitespace-nowrap">charge.refunded</code>
                        <span className="text-muted-foreground">Sent when a charge is fully refunded.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <code className="text-green-600 dark:text-green-400 font-bold whitespace-nowrap">topup.completed</code>
                        <span className="text-muted-foreground">Sent when an API-initiated wallet top-up is successfully paid via FPX.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <code className="text-destructive font-bold whitespace-nowrap">topup.failed</code>
                        <span className="text-muted-foreground">Sent when an API-initiated wallet top-up payment fails.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <code className="text-green-600 dark:text-green-400 font-bold whitespace-nowrap">distribution.completed</code>
                        <span className="text-muted-foreground">Sent when a 3rd-party cashback &amp; commission distribution is processed successfully.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payload Formats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payload Formats</CardTitle>
                  <CardDescription>JSON payloads sent to your webhook URL for each event type.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold">charge.completed</h4>
                  <CodeBlock>{`{
  "event": "charge.completed",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "completed",
  "metadata": { "order_id": "ORD-123" },
  "timestamp": "2026-02-16T12:00:00.000Z"
}`}</CodeBlock>

                  <h4 className="text-sm font-semibold mt-4">charge.failed</h4>
                  <p className="text-xs text-muted-foreground">Includes a <code className="text-destructive font-bold">reason</code> field indicating why the charge failed.</p>
                  <CodeBlock>{`{
  "event": "charge.failed",
  "charge_id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "failed",
  "reason": "INSUFFICIENT_BALANCE",
  "metadata": { "order_id": "ORD-123" },
  "timestamp": "2026-02-16T12:00:05.000Z"
}`}</CodeBlock>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-semibold">Reason Code</th>
                          <th className="text-left py-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs text-destructive">INSUFFICIENT_BALANCE</td>
                          <td className="py-2">User's wallet balance is too low for this charge.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs text-destructive">PIN_REQUIRED</td>
                          <td className="py-2">Amount exceeds the PIN threshold but no PIN was provided.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs text-destructive">PIN_NOT_SET</td>
                          <td className="py-2">User hasn't set up a PIN yet.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs text-destructive">INVALID_PIN</td>
                          <td className="py-2">The PIN provided was incorrect.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4 className="text-sm font-semibold mt-4">charge.partial_refund / charge.refunded</h4>
                  <CodeBlock>{`{
  "event": "charge.partial_refund",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.50,
  "reason": "Customer returned item",
  "status": "partial_refund",
  "timestamp": "2026-02-16T12:30:00.000Z"
}`}</CodeBlock>

                  <h4 className="text-sm font-semibold mt-4">topup.completed</h4>
                  <p className="text-xs text-muted-foreground">Sent when an API-initiated wallet top-up is successfully paid via FPX.</p>
                  <CodeBlock>{`{
  "event": "topup.completed",
  "transaction_id": "uuid",
  "amount": 50.00,
  "reference": "topup_001",
  "status": "completed",
  "timestamp": "2026-03-01T10:00:00.000Z"
}`}</CodeBlock>

                  <h4 className="text-sm font-semibold mt-4">topup.failed</h4>
                  <p className="text-xs text-muted-foreground">Sent when an API-initiated wallet top-up payment fails or is cancelled.</p>
                  <CodeBlock>{`{
  "event": "topup.failed",
  "transaction_id": "uuid",
  "amount": 50.00,
  "reference": "topup_001",
  "status": "failed",
  "timestamp": "2026-03-01T10:05:00.000Z"
}`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Signature Verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Signature Verification</CardTitle>
                  <CardDescription>Verify webhook authenticity using the HMAC-SHA256 signature.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Every webhook includes an <code className="text-primary font-bold">X-Webhook-Signature</code> header and an <code className="text-primary font-bold">X-Webhook-Attempt</code> header (attempt number, starting at 1).
                  </p>
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                      <div>
                        <p className="text-sm font-semibold">Hash your API Secret</p>
                        <p className="text-xs text-muted-foreground">Compute <code className="text-primary">SHA-256(api_secret)</code> to get the signing key.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                      <div>
                        <p className="text-sm font-semibold">Compute HMAC</p>
                        <p className="text-xs text-muted-foreground">Compute <code className="text-primary">HMAC-SHA256(raw_body, signing_key)</code>.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                      <div>
                        <p className="text-sm font-semibold">Compare signatures</p>
                        <p className="text-xs text-muted-foreground">Use constant-time comparison with the <code className="text-primary">X-Webhook-Signature</code> header.</p>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold">Node.js Example:</h4>
                  <CodeBlock>{`const crypto = require('crypto');

function verifyWebhook(body, signature, apiSecret) {
  // Step 1: SHA-256 hash of your API secret = signing key
  const signingKey = crypto
    .createHash('sha256')
    .update(apiSecret)
    .digest('hex');

  // Step 2: HMAC-SHA256 of the raw body using the signing key
  const computed = crypto
    .createHmac('sha256', signingKey)
    .update(body) // raw request body string
    .digest('hex');

  // Step 3: Compare
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(signature, 'hex')
  );
}`}</CodeBlock>

                  <h4 className="text-sm font-semibold mt-3">Python Example:</h4>
                  <CodeBlock>{`import hashlib, hmac

def verify_webhook(body: str, signature: str, api_secret: str) -> bool:
    signing_key = hashlib.sha256(api_secret.encode()).hexdigest()
    computed = hmac.new(
        signing_key.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Complete Handler Example */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Complete Webhook Handler</CardTitle>
                  <CardDescription>Production-ready Express.js handler with signature verification and event routing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeBlock>{`const crypto = require("crypto");
const express = require("express");
const app = express();

// Use raw body for signature verification
app.use("/webhook", express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); }
}));

function verifySignature(rawBody, signature, apiSecret) {
  const signingKey = crypto.createHash("sha256").update(apiSecret).digest("hex");
  const computed = crypto.createHmac("sha256", signingKey).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(signature, "hex"));
}

app.post("/webhook/nocap", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const attempt = req.headers["x-webhook-attempt"]; // "1", "2", or "3"

  // 1. Verify signature
  if (!signature || !verifySignature(req.rawBody, signature, process.env.NOCAP_API_SECRET)) {
    console.error("Invalid webhook signature");
    return res.status(403).json({ error: "Invalid signature" });
  }

  const event = req.body;
  console.log(\`Webhook received (attempt \${attempt}): \${event.event}\`);

  // 2. Route by event type
  switch (event.event) {
    case "charge.completed":
      // Mark order as paid
      await db.orders.update(
        { where: { reference: event.reference } },
        { status: "paid", transactionId: event.transaction_id }
      );
      break;

    case "charge.failed":
      // Handle failure — notify customer
      console.warn(\`Charge \${event.charge_id} failed: \${event.reason}\`);
      await notifyCustomer(event.reference, event.reason);
      break;

    case "charge.partial_refund":
    case "charge.refunded":
      // Update refund status
      await db.orders.update(
        { where: { reference: event.charge_id } },
        { refundStatus: event.status, refundedAmount: event.total_refunded }
      );
      break;

    default:
      console.log("Unknown event:", event.event);
  }

  // 3. Always respond 200 quickly
  res.status(200).json({ received: true });
});

app.listen(3000);`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Retry & Best Practices */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Retry Policy & Best Practices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Automatic Retries</h4>
                    <p className="text-sm text-muted-foreground">
                      If your endpoint returns a non-2xx status or is unreachable, we retry up to <strong>3 times</strong> with exponential backoff:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-4 font-semibold">Attempt</th>
                            <th className="text-left py-2 pr-4 font-semibold">Delay</th>
                            <th className="text-left py-2 font-semibold">Header</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-4">1st</td>
                            <td className="py-2 pr-4">Immediate</td>
                            <td className="py-2 font-mono text-xs">X-Webhook-Attempt: 1</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-4">2nd</td>
                            <td className="py-2 pr-4">~1 second</td>
                            <td className="py-2 font-mono text-xs">X-Webhook-Attempt: 2</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-4">3rd</td>
                            <td className="py-2 pr-4">~3 seconds</td>
                            <td className="py-2 font-mono text-xs">X-Webhook-Attempt: 3</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Best Practices</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><strong>Respond quickly:</strong> Return a <code className="text-primary">200</code> within 5 seconds. Process heavy logic asynchronously.</li>
                      <li><strong>Be idempotent:</strong> Use <code className="text-primary">charge_id</code> to deduplicate — you may receive the same event more than once on retries.</li>
                      <li><strong>Verify signatures:</strong> Always validate <code className="text-primary">X-Webhook-Signature</code> before processing.</li>
                      <li><strong>Use charge-status as source of truth:</strong> If unsure, poll <code className="text-primary">/api-charge-status</code> to confirm the actual charge state.</li>
                      <li><strong>Log attempts:</strong> Check the <code className="text-primary">X-Webhook-Attempt</code> header to monitor delivery reliability.</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-4 rounded-md">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>⚠️ Important:</strong> After 3 failed attempts, the webhook is abandoned for that event. 
                      Always use <code className="font-mono">/api-charge-status</code> as the definitive source of truth for charge status.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Webhook Replay with Idempotency */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Webhook Replay with Idempotency
                    <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold ml-2">v1.4</span>
                  </CardTitle>
                  <CardDescription>
                    Re-deliver any past webhook to your current webhook URL. Server-side payload + signature integrity checks
                    guarantee the replay is byte-identical to the original event. Idempotency-Key prevents duplicate dispatches.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Endpoint</h4>
                    <CodeBlock>{`POST https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-webhooks-replay
Headers:
  X-Api-Key: <your_api_key>
  X-Api-Secret: <your_api_secret>
  Content-Type: application/json
  Idempotency-Key: <uuid v4>   # recommended, max 255 chars

Body:
  { "delivery_id": "<UUID of the original webhook_deliveries row>" }`}</CodeBlock>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Success response (200)</h4>
                    <CodeBlock>{`{
  "data": {
    "replay_id": "9b4e...",          // new webhook_deliveries row
    "original_id": "6f1a...",        // delivery_id you sent
    "event": "order.paid",
    "delivered": true,
    "status_code": 200,
    "attempts": 1
  }
}
# Header on cached repeats: Idempotent-Replay: true`}</CodeBlock>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Integration prompt for your AI / dev</h4>
                    <CodeBlock>{`Implement a "Replay" action on the webhook delivery log:

1. On click, generate a fresh UUID and POST to /api-webhooks-replay
   with X-Api-Key, X-Api-Secret, and Idempotency-Key: <uuid>.
   Body: { delivery_id: <row.id> }.

2. Persist locally (idempotency_key, original_delivery_id, last_response)
   so you can dedupe and inspect.

3. Treat response header "Idempotent-Replay: true" as success — show
   the cached replay_id, never as a duplicate error.

4. Error matrix:
     400  invalid body / bad delivery_id
     401  invalid X-Api-Key / X-Api-Secret
     404  delivery_id not found OR belongs to another app
     409  signature integrity failed (api secret rotated since original
          dispatch) OR Idempotency-Key reused with different body
     429  rate limited — honor retry_after_seconds, then retry with the
          SAME Idempotency-Key

5. For 5xx responses, retry with exponential backoff (1s, 2s, 4s) and
   the SAME Idempotency-Key — the server returns the cached result if
   the first attempt actually completed.

6. Show the user: original event, original delivered_at, new replay_id,
   new status_code, attempt count. Badge the original row
   "replayed → <replay_id>".`}</CodeBlock>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 border border-border rounded-md">
                      <p className="text-xs font-semibold mb-1">Rate limits</p>
                      <p className="text-xs text-muted-foreground">30 replays/min per merchant · 5 replays/min per <code className="text-primary">delivery_id</code>.</p>
                    </div>
                    <div className="p-3 bg-muted/30 border border-border rounded-md">
                      <p className="text-xs font-semibold mb-1">Idempotency window</p>
                      <p className="text-xs text-muted-foreground">24 hours. Same key + same body → cached response. Same key + different body → <code className="text-primary">409</code>.</p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-4 rounded-md">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>⚠️ Signature integrity:</strong> If your <code className="font-mono">api_secret</code> was rotated since the original
                      delivery, the recomputed HMAC won't match the stored signature and the server returns <code className="font-mono">409</code> rather
                      than emit a webhook your verifier would reject. Replay the event from a fresh dispatch instead.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Sandbox Testing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sandbox Mode Testing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    When an API app is in <strong>Sandbox Mode</strong>, all charges complete instantly without requiring balance, PIN, or real money movement. 
                    Webhooks are still sent for both <code className="text-primary">charge.completed</code> and <code className="text-destructive">charge.failed</code> events, so you can verify your integration end-to-end.
                  </p>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-md">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Note:</strong> Sandbox responses include <code className="text-amber-900 dark:text-amber-200">is_sandbox: true</code>. 
                      Use this flag to skip real order processing during development.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="errors" forceMount className="data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Error Codes Reference</CardTitle>
                <CardDescription>Standard error responses returned by the API. All errors follow the format: <code className="text-primary">{`{ "error": "message" }`}</code></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold">HTTP</th>
                        <th className="text-left py-2 pr-4 font-semibold">Error</th>
                        <th className="text-left py-2 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">401</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Missing API credentials</td>
                        <td className="py-2">X-Api-Key or X-Api-Secret header is missing.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">401</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Invalid API credentials</td>
                        <td className="py-2">API Key not found, app inactive, or secret doesn't match.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">401</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Missing access token</td>
                        <td className="py-2">Authorization Bearer header is missing (for user-scoped endpoints).</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">401</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Invalid or expired access token</td>
                        <td className="py-2">The user access token is invalid, revoked, or has expired.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">403</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Insufficient scope</td>
                        <td className="py-2">Token doesn't have the required scope (e.g., "charge" or "balance").</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">429</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Rate limit exceeded</td>
                        <td className="py-2">Too many requests. Check <code className="text-primary">Retry-After</code> header for wait time in seconds.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Amount must be between 0.01 and 50000</td>
                        <td className="py-2">Charge amount is out of the allowed range.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Insufficient balance</td>
                        <td className="py-2">User's wallet doesn't have enough funds for the charge.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">PIN_REQUIRED</td>
                        <td className="py-2">Transaction requires PIN verification. Include <code className="text-primary">pin</code> in request body.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">PIN_NOT_SET</td>
                        <td className="py-2">User hasn't set a PIN yet. They must set one in the app first.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">403</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Invalid PIN</td>
                        <td className="py-2">The PIN provided is incorrect.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Cannot pay to your own branch</td>
                        <td className="py-2">Merchant cannot charge their own wallet.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Only completed charges can be refunded</td>
                        <td className="py-2">Refund attempted on a pending or failed charge.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Charge already fully refunded</td>
                        <td className="py-2">Total refunded amount has already reached the original charge amount.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Insufficient branch balance for refund</td>
                        <td className="py-2">Branch wallet doesn't have enough funds to process the refund.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">404</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Charge not found</td>
                        <td className="py-2">The charge_id doesn't exist or doesn't belong to your app.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">409</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Already authorized for this app</td>
                        <td className="py-2">User has already granted access to this app. Revoke first to re-authorize.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 bg-muted p-4 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Some charge errors include an additional <code className="text-primary">charge_id</code> field and a <code className="text-primary">code</code> field (e.g., <code>"code": "PIN_REQUIRED"</code>) for programmatic handling.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roadmap" forceMount className="data-[state=inactive]:hidden">
            <IntegrationRoadmap />
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
    </ApiCredentialsProvider>
  );
};

export default ApiDocs;
