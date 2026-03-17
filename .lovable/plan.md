

## Plan: Add External Chatbot Widget

Add the external chatbot widget script to `index.html` so it loads on every page.

### Changes

1. **`index.html`** — Add the chatbot script tag before the closing `</body>` tag:
   ```html
   <script src="https://202b086a-3f7f-4c20-a369-cee608900a21.lovableproject.com/widget.js" data-chatbot-id="77d1db3c-efc9-4fc0-9c8e-fed52592dc76"></script>
   ```

This will load the chatbot widget globally across all pages of the app.

