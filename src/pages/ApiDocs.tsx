import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const ApiDocs = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Code className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Developer Documentation</h1>
            <p className="text-muted-foreground">Integrate NoCap Wallet into your third-party application.</p>
          </div>
        </div>

        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started">
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
                  <h3 className="font-semibold text-lg">2. User Authorization</h3>
                  <p className="text-sm text-muted-foreground">
                    To access a user's wallet, you must obtain an authorization token. Redirect users to our authorization flow 
                    where they can grant permission to your application.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">3. Base URL</h3>
                  <p className="text-sm text-muted-foreground">All API requests should be made to our edge functions endpoint:</p>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
                    https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authentication">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>How to authenticate your requests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Every request to our API must include the following headers for identification and authorization.
                </p>
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><span className="font-mono font-bold text-primary">X-Api-Key</span></div>
                    <div className="text-muted-foreground">Your application's unique public key.</div>
                    <div><span className="font-mono font-bold text-primary">X-Api-Secret</span></div>
                    <div className="text-muted-foreground">Your application's private secret key.</div>
                    <div><span className="font-mono font-bold text-primary">Authorization</span></div>
                    <div className="text-muted-foreground">Bearer &lt;user_access_token&gt;</div>
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-4 rounded-md">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Security Note:</strong> Never expose your API Secret in client-side code. All calls using the secret should be made from your server.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-balance</CardTitle>
                  </div>
                  <CardDescription>Retrieve the authenticated user's current wallet balance.</CardDescription>
                </CardHeader>
                <CardContent>
                  <h4 className="text-sm font-semibold mb-2">Request Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-balance" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"`}
                  </pre>
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
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold mb-2">Request Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token" \\
  -d '{
    "amount": 10.50,
    "description": "Order #12345",
    "reference": "txn_88291"
  }'`}
                  </pre>
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
                <CardContent>
                  <h4 className="text-sm font-semibold mb-2">Query Parameters:</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <code className="text-primary font-bold">charge_id</code> (string, required): The ID of the charge returned by the /api-charge endpoint.
                  </p>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge-status?charge_id=CHG_123" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default ApiDocs;
