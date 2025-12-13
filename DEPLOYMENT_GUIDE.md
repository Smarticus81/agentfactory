# FamilyAI Studio - Complete Deployment Guide

## Project Overview
FamilyAI Studio is a premium voice-enabled AI assistant platform with three specialized agent types:
- **Family Assistant**: Family coordination, scheduling, and member management
- **Personal Admin**: Email integration, task management, and productivity tools
- **Student Helper**: Homework tracking, study materials, and academic organization

## Architecture
- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Convex (real-time database and serverless functions)
- **Authentication**: Clerk
- **Voice**: OpenAI Realtime API, ElevenLabs, Google TTS, PlayHT
- **Integrations**: Gmail, Google Calendar, Google Drive
- **Deployment**: Render.com (Docker-based)

## Current Status
✅ **Production Ready Features**:
- Voice pipeline with wake word detection
- Multi-provider voice synthesis (ElevenLabs, OpenAI, Google, PlayHT)
- Gmail OAuth integration with app password fallback
- Document upload and RAG system
- Agent deployment system
- PWA capabilities
- Real-time voice commands and tools

## Deployment Platform: Render.com

### Why Render?
1. **Docker Native**: Full control over build and runtime environment
2. **Simple Configuration**: Single `render.yaml` file for complete setup
3. **Automatic Deploys**: Git-based deployments from main branch
4. **Managed Infrastructure**: Automatic SSL, CDN, and health checks
5. **Cost Effective**: Generous free tier, predictable pricing
6. **Next.js Optimized**: Works perfectly with Next.js standalone output
7. **No Vendor Lock-in**: Standard Docker deployment

## Deployment Steps

### 1. Prerequisites
- GitHub repository connected to Render
- Convex account and deployment
- Clerk account for authentication
- API keys for OpenAI, ElevenLabs (optional)
- Google Cloud OAuth credentials

### 2. Convex Backend Setup
```bash
# Install Convex CLI
npm install -g convex

# Deploy to production
convex deploy --prod

# Set up environment variables in Convex dashboard
# Visit: https://dashboard.convex.dev
```

### 3. Render Deployment

#### Option A: Using Render Dashboard (Recommended)
1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` configuration
5. Review and confirm the settings
6. Add environment variables (see section below)
7. Click "Create Web Service"

#### Option B: Using render.yaml (Automatic)
The repository includes a `render.yaml` file that will be automatically detected by Render. Simply:
1. Connect your GitHub repo to Render
2. Render will read the configuration automatically
3. Set the required environment variables
4. Deploy!

### 4. Required Environment Variables

Set these in your Render dashboard under "Environment":

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Convex Backend
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# OpenAI
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_OPENAI_API_KEY=sk-...

# ElevenLabs (Optional)
ELEVENLABS_API_KEY=sk_...

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URL
NEXT_PUBLIC_BASE_URL=https://your-app.onrender.com
```

### 5. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API and Google Calendar API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URIs:
   - `https://your-app.onrender.com/api/auth/callback/google`
   - `https://your-app.onrender.com/api/gmail/callback`
7. Copy Client ID and Client Secret to Render environment variables

## File Structure

```
familyai-studio/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Main dashboard
│   │   ├── agent/             # Agent interfaces
│   │   └── onboarding/        # User onboarding
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn/ui components
│   │   └── *.tsx             # Feature components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and services
│   └── middleware.ts         # Auth middleware
├── convex/                   # Backend functions
│   ├── schema.ts            # Database schema
│   ├── agents.ts            # Agent management
│   ├── users.ts             # User management
│   ├── voice_*.ts           # Voice functionality
│   └── *.ts                 # Feature modules
├── public/                   # Static assets
├── Dockerfile               # Docker build configuration
├── render.yaml             # Render deployment config
├── package.json            # Dependencies
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Styling configuration
└── tsconfig.json          # TypeScript configuration
```

## Key Features

### Voice Pipeline
- Wake word detection with customizable phrases
- Multi-provider voice synthesis
- Real-time transcription and response
- Tools integration (email, calendar, documents)
- RAG system for document knowledge

### Agent Types
1. **Family Assistant**
   - Family member management
   - Shared calendar coordination
   - Task assignment and tracking
   - Family document storage

2. **Personal Admin**
   - Gmail integration with OAuth
   - Task prioritization system
   - Calendar synchronization
   - Email event extraction

3. **Student Helper**
   - Homework tracking by subject
   - Study material organization
   - Academic deadline management
   - Note-taking with difficulty levels

### Integrations
- **Gmail**: Send/receive emails, extract events
- **Google Calendar**: Sync events, manage schedules
- **Google Drive**: Document storage and retrieval
- **OpenAI**: GPT-4o for intelligent responses
- **ElevenLabs**: Premium voice synthesis

## Performance Optimizations
- Docker multi-stage builds for minimal image size
- Next.js standalone output for optimal performance
- Code splitting and lazy loading
- PWA caching strategies
- Database indexing for fast queries
- CDN and edge caching via Render

## Security Features
- Clerk authentication with JWT tokens
- OAuth 2.0 for third-party integrations
- Environment variable encryption
- User data isolation
- Rate limiting on API endpoints
- HTTPS enforced by default

## Monitoring & Health Checks
- Render automatic health checks on `/`
- Convex dashboard for backend metrics
- Error tracking and logging
- User activity monitoring
- Voice pipeline success rates

## Scaling Considerations
- Render auto-scaling based on traffic
- Convex handles database scaling automatically
- Stateless Docker containers for horizontal scaling
- CDN caching for static assets
- Background job processing via Convex

## Cost Estimation (Monthly)
- **Render Starter**: $7/month (512MB RAM, good for testing)
- **Render Standard**: $25/month (2GB RAM, recommended for production)
- **Convex**: $25/month (includes database and functions)
- **OpenAI API**: $50-200/month (depends on usage)
- **ElevenLabs**: $22/month (Creator plan, optional)
- **Total**: ~$104-272/month for production usage

## Troubleshooting

### Build Failures
- Check Docker build logs in Render dashboard
- Ensure all environment variables are set
- Verify `pnpm-lock.yaml` is committed

### Runtime Errors
- Check application logs in Render dashboard
- Verify Convex deployment URL is correct
- Ensure Clerk keys are for production environment
- Confirm Google OAuth redirect URIs match your domain

### Performance Issues
- Upgrade to higher Render plan if needed
- Check Convex query performance in dashboard
- Review Next.js build output for large bundles
- Enable Redis caching if necessary

## Continuous Deployment

Render automatically deploys when you push to the `main` branch:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

Render will:
1. Detect the push to main
2. Build the Docker image
3. Run health checks
4. Deploy with zero downtime
5. Rollback automatically if health checks fail

## Support & Maintenance
- Automated deployments via GitHub
- Environment variable management in Render dashboard
- Database backups via Convex
- Error monitoring and alerts
- Performance optimization tools

## Next Steps
1. ✅ Connect GitHub repository to Render
2. ✅ Set up Convex backend in production
3. ✅ Configure all environment variables
4. ✅ Set up Google OAuth with production domain
5. ✅ Deploy and verify health checks pass
6. ✅ Test all integrations in production
7. ✅ (Optional) Add custom domain
8. ✅ Launch with confidence!

---

**Your FamilyAI Studio is ready for production deployment on Render!** 🚀

## Additional Resources
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Convex Production Best Practices](https://docs.convex.dev/production)
- [Clerk Production Checklist](https://clerk.com/docs/deployments/production-checklist)
