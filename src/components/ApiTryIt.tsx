import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, ChevronDown, ChevronUp, Loader2, Copy, Check } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";

interface ParamField {
  name: string;
  placeholder: string;
  required?: boolean;
  type?: 'header' | 'query' | 'body';
}

interface ApiTryItProps {
  method: 'GET' | 'POST';
  endpoint: string;
  params: ParamField[];
  bodyFields?: { name: string; placeholder: string; type?: 'string' | 'number' | 'json'; required?: boolean }[];
  needsApiKey?: boolean;
  needsApiSecret?: boolean;
  needsUserToken?: boolean;
}

const BASE_URL = "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1";

const ApiTryIt = ({ method, endpoint, params, bodyFields, needsApiKey = true, needsApiSecret = true, needsUserToken = true }: ApiTryItProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [userToken, setUserToken] = useState("");
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [bodyParams, setBodyParams] = useState<Record<string, string>>({});

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);

    try {
      let url = `${BASE_URL}/${endpoint}`;
      
      // Build query params
      const qp = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value.trim()) qp.set(key, value.trim());
      }
      const qs = qp.toString();
      if (qs) url += `?${qs}`;

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (needsApiKey && apiKey.trim()) headers['X-Api-Key'] = apiKey.trim();
      if (needsApiSecret && apiSecret.trim()) headers['X-Api-Secret'] = apiSecret.trim();
      if (needsUserToken && userToken.trim()) headers['Authorization'] = `Bearer ${userToken.trim()}`;

      // Build body
      let body: string | undefined;
      if (method === 'POST' && bodyFields?.length) {
        const bodyObj: Record<string, unknown> = {};
        for (const field of bodyFields) {
          const val = bodyParams[field.name];
          if (val === undefined || val === '') continue;
          if (field.type === 'number') {
            bodyObj[field.name] = parseFloat(val);
          } else if (field.type === 'json') {
            try { bodyObj[field.name] = JSON.parse(val); } catch { bodyObj[field.name] = val; }
          } else {
            bodyObj[field.name] = val;
          }
        }
        body = JSON.stringify(bodyObj, null, 2);
      }

      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      
      let formatted: string;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        formatted = text;
      }

      setResponse({ status: res.status, body: formatted });
    } catch (err) {
      setResponse({ status: 0, body: err instanceof Error ? err.message : 'Network error' });
    }
    setLoading(false);
  };

  const copyResponse = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-500";
    if (status >= 400 && status < 500) return "text-amber-500";
    return "text-destructive";
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
        >
          <Play className="h-3.5 w-3.5" />
          Try It
          {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-4">
          {/* Credentials */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credentials</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {needsApiKey && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <Input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Your API Key"
                    className="text-xs h-8 font-mono"
                  />
                </div>
              )}
              {needsApiSecret && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">API Secret</Label>
                  <Input
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Your API Secret"
                    type="password"
                    className="text-xs h-8 font-mono"
                  />
                </div>
              )}
            </div>
            {needsUserToken && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Access Token (Bearer)</Label>
                <Input
                  value={userToken}
                  onChange={(e) => setUserToken(e.target.value)}
                  placeholder="User access token or test token"
                  className="text-xs h-8 font-mono"
                />
              </div>
            )}
          </div>

          {/* Query Params */}
          {params.filter(p => p.type === 'query').length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Query Parameters</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {params.filter(p => p.type === 'query').map((p) => (
                  <div key={p.name} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {p.name} {p.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      value={queryParams[p.name] || ""}
                      onChange={(e) => setQueryParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                      placeholder={p.placeholder}
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body Fields */}
          {bodyFields && bodyFields.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request Body</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bodyFields.map((f) => (
                  <div key={f.name} className={`space-y-1 ${f.type === 'json' ? 'md:col-span-2' : ''}`}>
                    <Label className="text-xs text-muted-foreground">
                      {f.name} {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    {f.type === 'json' ? (
                      <Textarea
                        value={bodyParams[f.name] || ""}
                        onChange={(e) => setBodyParams(prev => ({ ...prev, [f.name]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="text-xs font-mono min-h-[60px]"
                      />
                    ) : (
                      <Input
                        value={bodyParams[f.name] || ""}
                        onChange={(e) => setBodyParams(prev => ({ ...prev, [f.name]: e.target.value }))}
                        placeholder={f.placeholder}
                        type={f.type === 'number' ? 'number' : 'text'}
                        className="text-xs h-8 font-mono"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button onClick={handleSend} disabled={loading} className="w-full gap-2" size="sm">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Send Request
          </Button>

          {/* Response */}
          {response && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Response
                  <span className={`ml-2 font-mono ${statusColor(response.status)}`}>
                    {response.status || 'ERR'}
                  </span>
                </p>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={copyResponse}>
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </Button>
              </div>
              <CodeBlock>{response.body}</CodeBlock>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ApiTryIt;
