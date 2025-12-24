# DeathRoll Deployment Guide

## GitHub Pages (Recommended - Free & Easy)

### Quick Setup

1. **Push your code to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/deathroll.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: "GitHub Actions"
   - Save

3. **Deploy automatically**
   - Push to main branch triggers automatic deployment
   - Or go to Actions tab → "Deploy to GitHub Pages" → Run workflow

4. **Access your app**
   - If repo name is `deathroll`: https://YOUR_USERNAME.github.io/deathroll/
   - If repo name is `YOUR_USERNAME.github.io`: https://YOUR_USERNAME.github.io/

### Custom Domain (Optional)

1. Add a `CNAME` file to `public/` folder:
   ```bash
   echo "yourdomain.com" > public/CNAME
   ```

2. Configure DNS:
   - Add CNAME record: `www` → `YOUR_USERNAME.github.io`
   - Add A records for apex domain:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`

3. Enable custom domain in GitHub Pages settings

---

## Alternative Deployment Options

### Vercel (Next.js Creator - Free Tier)

**Best for:** Zero-config Next.js deployment, automatic previews

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

Or connect GitHub repo at https://vercel.com

**Features:**
- Automatic deployments on git push
- Preview URLs for pull requests
- Built-in analytics
- Edge network (fast globally)

---

### Netlify (Free Tier)

**Best for:** Easy drag-and-drop, great build features

1. **Via CLI:**
   ```bash
   npm i -g netlify-cli
   npm run build
   netlify deploy --prod --dir=out
   ```

2. **Via Web:**
   - Go to https://app.netlify.com
   - Drag `out` folder or connect GitHub repo
   - Build command: `npm run build`
   - Publish directory: `out`

**Features:**
- Form handling
- Serverless functions
- Split testing
- Built-in CI/CD

---

### Cloudflare Pages (Free)

**Best for:** Global CDN, unlimited bandwidth

1. Connect GitHub repo at https://pages.cloudflare.com
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `out`

**Features:**
- Unlimited bandwidth (no limits!)
- Workers for serverless logic
- Web analytics
- Fast global CDN

---

### Self-Hosted (Your Own Server)

**Best for:** Full control, custom infrastructure

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Serve with nginx:**
   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;
     root /path/to/deathroll/out;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

3. **Or use a static server:**
   ```bash
   npx serve out -p 3000
   ```

---

## PeerJS Signaling Server

Your app uses the **free public PeerJS server** (0.peerjs.com) for WebRTC signaling. This works well for most users.

### Optional: Self-Host PeerJS Server

For better reliability or privacy:

```bash
# Install PeerJS server
npm install -g peer

# Run on port 9000
peerjs --port 9000 --key peerjs --path /myapp

# Or use Docker
docker run -p 9000:9000 -d peerjs/peerjs-server
```

Then update `src/lib/peer/config.ts`:
```typescript
export const peerConfig: PeerOptions = {
  host: 'your-signaling-server.com',
  port: 9000,
  path: '/myapp',
  config: {
    iceServers: getIceServers(),
  },
};
```

---

## Environment Variables (Optional)

### TURN Server Configuration

For better connection reliability (95% → 99% success rate), configure a TURN server:

```bash
# .env.local
NEXT_PUBLIC_TURN_URL=turn:turnserver.example.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-password
```

**Free TURN Providers:**
- [Metered.ca](https://www.metered.ca/tools/openrelay/) - 50GB/month free
- [Twilio](https://www.twilio.com/stun-turn) - Free trial
- [Xirsys](https://xirsys.com/) - Free tier available

**For GitHub Pages:** Add secrets in Settings → Secrets and variables → Actions

---

## Testing Your Deployment

1. **PWA Installation:**
   - Visit deployed URL in Chrome/Edge
   - Check for "Install app" prompt
   - Test "Add to Home Screen"

2. **Offline Mode:**
   - Load the app once
   - Disconnect internet
   - Refresh page (should show offline page)

3. **WebRTC Connection:**
   - Host a game
   - Join from another device/browser
   - Verify peer-to-peer connection works

4. **Network Quality:**
   - Check connection status indicator
   - Test reconnection by toggling WiFi

---

## Build Optimization

Your app is already optimized:

- ✅ Static export enabled
- ✅ Images unoptimized (for static hosting)
- ✅ Service worker for offline support
- ✅ PWA manifest for installability

**Build output:**
```bash
npm run build
# Output: ./out directory (ready to deploy)
```

---

## Troubleshooting

### Issue: Base path incorrect on GitHub Pages

If your app is at `username.github.io/deathroll/` but assets 404:

1. Update `next.config.ts`:
   ```typescript
   const nextConfig: NextConfig = {
     output: "export",
     basePath: "/deathroll",  // Add this
     assetPrefix: "/deathroll/",  // Add this
     images: {
       unoptimized: true,
     },
   };
   ```

2. Rebuild and redeploy

### Issue: PeerJS connections failing

- Check browser console for errors
- Verify STUN/TURN server accessibility
- Try configuring a TURN server (see Environment Variables)

### Issue: Service worker not updating

- Clear cache: DevTools → Application → Clear storage
- Unregister: DevTools → Application → Service Workers → Unregister
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## Cost Comparison

| Provider | Free Tier | Bandwidth | Build Minutes |
|----------|-----------|-----------|---------------|
| **GitHub Pages** | ✅ Yes | 100GB/month | ♾️ Unlimited |
| **Vercel** | ✅ Yes | 100GB/month | 6000 min/month |
| **Netlify** | ✅ Yes | 100GB/month | 300 min/month |
| **Cloudflare** | ✅ Yes | ♾️ Unlimited | 500 builds/month |

**Recommendation:** Start with GitHub Pages (easiest), upgrade to Cloudflare if you need unlimited bandwidth.

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Enable GitHub Pages (Actions source)
3. ✅ Push to main → automatic deployment
4. 🎮 Share your game URL!

Questions? Check the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
