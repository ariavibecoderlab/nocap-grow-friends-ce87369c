import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, ChevronDown, ChevronUp, Loader2, Copy, Check, History, RotateCcw, Trash2, Clock, Terminal, Save, X } from "lucide-react";
import { toast } from "sonner";
import CodeBlock from "@/components/CodeBlock";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApiCredentials } from "@/contexts/ApiCredentialsContext";

interface ParamField {
  name: string;
  placeholder: string;
  required?: boolean;
  type?: 'header' | 'query' | 'body';
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status: number;
  responseBody: string;
  queryParams: Record<string, string>;
  bodyParams: Record<string, string>;
  apiKey: string;
  apiSecret: string;
  userToken: string;
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
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const { credentials, setCredentials, saved, save: saveCredentials, clear: clearCredentials } = useApiCredentials();

  const apiKey = credentials.apiKey;
  const apiSecret = credentials.apiSecret;
  const userToken = credentials.userToken;
  const setApiKey = (v: string) => setCredentials({ apiKey: v });
  const setApiSecret = (v: string) => setCredentials({ apiSecret: v });
  const setUserToken = (v: string) => setCredentials({ userToken: v });
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [bodyParams, setBodyParams] = useState<Record<string, string>>({});

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);

    try {
      let url = `${BASE_URL}/${endpoint}`;
      
      const qp = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value.trim()) qp.set(key, value.trim());
      }
      const qs = qp.toString();
      if (qs) url += `?${qs}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (needsApiKey && apiKey.trim()) headers['X-Api-Key'] = apiKey.trim();
      if (needsApiSecret && apiSecret.trim()) headers['X-Api-Secret'] = apiSecret.trim();
      if (needsUserToken && userToken.trim()) headers['Authorization'] = `Bearer ${userToken.trim()}`;

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

      const result = { status: res.status, body: formatted };
      setResponse(result);

      // Add to history
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        method,
        url,
        status: res.status,
        responseBody: formatted,
        queryParams: { ...queryParams },
        bodyParams: { ...bodyParams },
        apiKey,
        apiSecret,
        userToken,
      };
      setHistory(prev => [entry, ...prev].slice(0, 20));
    } catch (err) {
      const result = { status: 0, body: err instanceof Error ? err.message : 'Network error' };
      setResponse(result);
    }
    setLoading(false);
  };

  const replayEntry = useCallback((entry: HistoryEntry) => {
    setApiKey(entry.apiKey);
    setApiSecret(entry.apiSecret);
    setUserToken(entry.userToken);
    setQueryParams(entry.queryParams);
    setBodyParams(entry.bodyParams);
    setResponse({ status: entry.status, body: entry.responseBody });
    setShowHistory(false);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setShowHistory(false);
  }, []);

  const buildCurl = useCallback(() => {
    let url = `${BASE_URL}/${endpoint}`;
    const qp = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value.trim()) qp.set(key, value.trim());
    }
    const qs = qp.toString();
    if (qs) url += `?${qs}`;

    const parts = [`curl -X ${method} "${url}"`];
    if (needsApiKey && apiKey.trim()) parts.push(`  -H "X-Api-Key: ${apiKey.trim()}"`);
    if (needsApiSecret && apiSecret.trim()) parts.push(`  -H "X-Api-Secret: ${apiSecret.trim()}"`);
    if (needsUserToken && userToken.trim()) parts.push(`  -H "Authorization: Bearer ${userToken.trim()}"`);

    if (method === 'POST' && bodyFields?.length) {
      parts.push(`  -H "Content-Type: application/json"`);
      const bodyObj: Record<string, unknown> = {};
      for (const field of bodyFields) {
        const val = bodyParams[field.name];
        if (val === undefined || val === '') continue;
        if (field.type === 'number') bodyObj[field.name] = parseFloat(val);
        else if (field.type === 'json') {
          try { bodyObj[field.name] = JSON.parse(val); } catch { bodyObj[field.name] = val; }
        } else bodyObj[field.name] = val;
      }
      if (Object.keys(bodyObj).length > 0) {
        parts.push(`  -d '${JSON.stringify(bodyObj)}'`);
      }
    }

    return parts.join(" \\\n");
  }, [method, endpoint, queryParams, bodyParams, apiKey, apiSecret, userToken, needsApiKey, needsApiSecret, needsUserToken, bodyFields]);

  const copyCurl = useCallback(async () => {
    await navigator.clipboard.writeText(buildCurl());
    toast.success("cURL command copied to clipboard");
  }, [buildCurl]);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
          {history.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 font-mono">
              {history.length}
            </span>
          )}
          {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-4">
          {/* History Toggle */}
          {history.length > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-3 w-3" />
                History ({history.length})
                {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              {showHistory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-destructive"
                  onClick={clearHistory}
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* History List */}
          {showHistory && history.length > 0 && (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => replayEntry(entry)}
                    className="w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-accent/50 transition-colors border border-border/50 group"
                  >
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      entry.method === 'GET' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {entry.method}
                    </span>
                    <span className={`text-xs font-mono font-semibold ${statusColor(entry.status)}`}>
                      {entry.status || 'ERR'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
                      /{endpoint}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(entry.timestamp)}
                    </span>
                    <RotateCcw className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Credentials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credentials</p>
              <div className="flex gap-1">
                {(apiKey || apiSecret || userToken) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => { saveCredentials(); toast.success("Credentials saved for all endpoints"); }}
                  >
                    <Save className="h-2.5 w-2.5" />
                    {saved ? "Update" : "Save"}
                  </Button>
                )}
                {saved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => { clearCredentials(); toast("Saved credentials cleared"); }}
                  >
                    <X className="h-2.5 w-2.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
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

          {/* Send + cURL Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSend} disabled={loading} className="flex-1 gap-2" size="sm">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Send Request
            </Button>
            <Button onClick={copyCurl} variant="outline" size="sm" className="gap-1.5 border-primary/20 text-primary hover:bg-primary/5">
              <Terminal className="h-3.5 w-3.5" />
              cURL
            </Button>
          </div>
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
