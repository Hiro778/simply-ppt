# AUTONOMOUS DEVELOPMENT BRIEF — SIMPLY PPT

**Project:** Simply PPT  
**Repository:** https://github.com/Hiro778/simply-ppt.git  
**Owner:** Hiro778  
**Phase:** 1 — Desktop Application  
**Execution Mode:** Autonomous End-to-End Development  
**Priority:** Functionality → Security → Reliability → UI/UX → Documentation → GitHub Release

---

# 1. YOUR MISSION

You are the autonomous senior full-stack engineer, software architect, QA engineer, security engineer, and DevOps engineer responsible for delivering Simply PPT.

Your task is to build a fully functional desktop-first presentation control system.

This is NOT a UI-only prototype.

You must implement actual functionality, integrate the required services, run tests, fix discovered issues, document the system, and publish the finished code to the specified GitHub repository.

**CRITICAL DEVELOPMENT RULE:**

Build the laptop/desktop application FIRST.

Do not start Android APK development in this phase.

Once the desktop application is complete, tested, secured, documented, and successfully pushed to GitHub, produce a comprehensive completion report and STOP.

Wait for explicit owner approval before starting Phase 2 (Android APK).

# 2. PRODUCT VISION

Simply PPT is a presentation control system consisting of:

- Desktop application: presentation host and display.
- Android application: future remote controller.
- Supabase: cloud pairing and real-time communication.

The desktop application must work locally on the user's computer.

The user must NOT need to upload their presentation to a cloud service.

The user must NOT need to connect their laptop and phone to the same Wi-Fi network.

Future mobile devices will connect through Supabase over the internet.

Tagline:

"A smarter way to present."

# 3. TECHNICAL STACK

Choose stable, compatible versions.

Preferred architecture:

Desktop:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate
- PDF.js
- Node.js local server
- WebSocket where appropriate

Cloud:
- Supabase PostgreSQL
- Supabase Realtime
- Supabase Edge Functions where necessary
- Supabase Row Level Security

Testing:
- Vitest
- Playwright
- React Testing Library where useful

Infrastructure:
- pnpm
- ESLint
- TypeScript strict mode
- GitHub repository

You may adjust the architecture if there is a strong technical reason. Document every significant deviation.

Avoid unnecessary dependencies and overengineering.

# 4. DESKTOP APPLICATION REQUIREMENTS

## A. Dashboard

Create a polished desktop dashboard containing:

- Application branding.
- New Presentation.
- Recent Presentations.
- Presentation History.
- Settings.
- Connection Status.

## B. Import System

Initial supported format:

- PDF.

Requirements:

- Drag and drop PDF.
- Browse local files.
- Validate file type and size.
- Handle corrupted PDFs.
- Display document information.
- Show total slide count.
- Render slides correctly.
- Preserve aspect ratios.
- Support large documents without loading every page into memory simultaneously.

Canva support:

For Phase 1, support importing Canva presentations through exported PDF files.

Do not claim direct Canva integration unless an actual supported API integration is implemented and tested.

## C. Presentation Engine

Implement:

- Fullscreen presentation.
- Next slide.
- Previous slide.
- Direct slide navigation.
- Keyboard navigation.
- Slide counter.
- Escape to exit fullscreen.
- Smooth slide transitions.
- Correct display scaling.
- Presentation state management.

The presentation display must be clean.

When presentation mode starts, hide application navigation, buttons, and unnecessary interface elements.

Only display the actual presentation slide.

## D. Display Customization

Support:

- Background color.
- Presentation scaling.
- Fit to screen.
- Fullscreen.
- Optional transition effects.

Color selection must be configurable.

# 5. CLOUD PAIRING ARCHITECTURE

Use Supabase for cross-network device pairing.

Do NOT implement same-Wi-Fi-only pairing.

The desktop application must be capable of creating a pairing session.

Pairing flow:

1. User starts a presentation.
2. Desktop generates a unique six-digit Pair Code.
3. Code expires after three minutes.
4. User enters the code in the future mobile application.
5. Supabase validates the pairing request.
6. Desktop receives the request.
7. Desktop owner approves the device.
8. A secure device session is established.
9. Devices communicate through Supabase Realtime.

Security requirements:

- Pair codes must be single-use.
- Enforce expiration.
- Rate-limit invalid pairing attempts.
- Use cryptographically secure random generation.
- Never expose service-role credentials.
- Do not store raw long-lived access tokens unnecessarily.
- Implement authorization policies.
- Implement session revocation.
- Prevent unauthorized session access.

The desktop must remain usable if Supabase becomes unavailable.

Local presentation functionality must not depend on cloud availability.

Implement cloud reconnection and clear connection status.

IMPORTANT:

Do not assume Supabase Realtime is automatically a complete secure authentication system.

Design and test authorization explicitly.

# 6. PREPARE THE FUTURE MOBILE COMMUNICATION CONTRACT

Do not develop the Android application yet.

However, prepare shared protocol definitions so Phase 2 can integrate without rewriting the desktop architecture.

Define these commands:

- NEXT_SLIDE
- PREVIOUS_SLIDE
- GO_TO_SLIDE
- DRAW
- HIGHLIGHT
- LASER_POINTER
- ZOOM
- CLEAR_ANNOTATION
- PRESENTATION_STATE
- DEVICE_CONNECTED
- DEVICE_DISCONNECTED

Define:

- Command schemas.
- Event schemas.
- Payload validation.
- Session identifiers.
- Error handling.
- Reconnection behavior.

Prepare shared TypeScript types and protocol documentation.

The future mobile application will contain four modes:

1. Remote.
2. Annotation.
3. Presenter.
4. Speak Only.

Speak Only will support exactly THREE voice commands:

- "Lanjut slide" → NEXT_SLIDE.
- "Slide sebelumnya" → PREVIOUS_SLIDE.
- "Slide [number]" → GO_TO_SLIDE.

Do not add other voice commands.

# 7. SECURITY REQUIREMENTS

Security is mandatory.

Implement:

- Localhost binding to 127.0.0.1 by default.
- Secure local file handling.
- File validation.
- Input validation.
- Safe error handling.
- Supabase RLS.
- Secure environment variable handling.
- No exposed service-role keys.
- No hardcoded secrets.
- No unrestricted file-system access.
- No arbitrary file uploads to remote services.
- Dependency vulnerability checks.

The presentation PDF must remain on the local computer.

Never upload the original presentation PDF to Supabase Storage unless explicitly authorized by the owner.

Create:

- .env.example
- .gitignore
- SECURITY.md
- Appropriate setup documentation.

Ensure that .env, credentials, private keys, tokens, local documents, and other sensitive files cannot accidentally enter Git commits.

# 8. UI/UX DESIGN DIRECTION

Brand: Simply PPT.

Design direction:

- Premium dark interface.
- Modern glassmorphism.
- Purple/violet accent colors.
- Subtle gradients.
- Clean typography.
- Smooth animations.
- Consistent spacing.
- Responsive desktop layouts.
- Minimal visual clutter.

Avoid generic AI-generated dashboard aesthetics.

The interface must look like a finished commercial software product.

Use consistent icons and reusable components.

Create a cohesive design system.

# 9. AUTOMATED TESTING

Do not declare completion just because the application starts.

Create and execute tests for:

### Unit Testing
- PDF validation.
- Slide navigation.
- Presentation state.
- Pair Code generation.
- Pair Code expiration.
- Command validation.
- Session validation.

### Integration Testing
- PDF upload and rendering.
- Local presentation workflow.
- Supabase pairing workflow.
- Device approval.
- Realtime event handling.
- Reconnection.
- Session revocation.

### End-to-End Testing

Simulate the complete desktop workflow:

1. Launch application.
2. Import PDF.
3. Start presentation.
4. Navigate slides.
5. Generate Pair Code.
6. Simulate mobile pairing request.
7. Approve device.
8. Send remote commands through a test client.
9. Verify slide changes.
10. Disconnect device.
11. Reconnect.
12. Stop presentation.

Use mock services for automated tests when real Supabase credentials are unavailable.

Clearly distinguish simulated integration tests from tests against a real Supabase project.

### Build Verification

Run:

- TypeScript checks.
- ESLint.
- Unit tests.
- Integration tests.
- E2E tests.
- Production build.
- Dependency security audit.

Fix errors before release.

Never fabricate passing test results.

# 10. GITHUB DOCUMENTATION

The repository must look professional.

Create a complete README.md inspired by the clean GitHub repository presentation shown by the owner.

Required README structure:

1. Project banner.
2. Application name: Simply PPT.
3. Short product description.
4. Main features.
5. Architecture overview.
6. Screenshots section.
7. Tech stack.
8. Requirements.
9. Installation.
10. Local development.
11. Environment configuration.
12. Supabase setup.
13. Build instructions.
14. Testing instructions.
15. Security notes.
16. Project roadmap.
17. License.

IMPORTANT DESIGN REQUIREMENTS:

Create a custom README banner.

Banner must include:

- Simply PPT branding.
- A clear presentation-related visual.
- Purple/violet visual identity.
- Tagline: "A smarter way to present."
- Clean professional composition.

Use a locally stored image such as:

assets/banner.png

Reference it properly inside README.md.

Do NOT add fake GitHub stars, fake download counts, fake trending badges, or misleading popularity claims.

Do not add unnecessary promotional badges.

The README must be accurate and reflect implemented functionality only.

Include screenshots from the actual application whenever possible.

# 11. GITHUB AUTOMATION AND RELEASE

Target repository:

https://github.com/Hiro778/simply-ppt.git

First inspect the repository.

If it is empty, initialize the project.

If it already contains files or commits, inspect and preserve existing work.

Do not blindly overwrite existing repository content.

Before pushing:

1. Run all checks.
2. Inspect git status.
3. Inspect staged changes.
4. Check for secrets.
5. Check .gitignore.
6. Verify README and banner assets.
7. Verify production build.
8. Confirm the correct GitHub remote.

Expected Git workflow for a new repository:

git init
git add .
git commit -m "feat: initialize Simply PPT desktop application"
git branch -M main
git remote add origin https://github.com/Hiro778/simply-ppt.git
git push -u origin main

If the remote already exists, inspect it and use the correct remote configuration.

Never force-push or destroy existing history without explicit authorization.

If GitHub authentication is unavailable, do not pretend the push succeeded. Explain the blocker and provide the exact remaining commands.

# 12. AUTONOMOUS EXECUTION RULES

You are expected to work independently.

Do not stop after creating a plan.

Do not stop after generating the interface.

Do not stop after creating placeholder files.

Do not leave core functionality as TODO comments.

You must:

- Inspect the environment.
- Inspect the repository.
- Plan implementation.
- Build the application.
- Integrate services.
- Test functionality.
- Fix discovered issues.
- Improve UI quality.
- Write documentation.
- Create the banner.
- Run security checks.
- Commit and push verified work.

Do not ask the owner to approve every minor implementation decision.

Use reasonable engineering judgment.

However:

- Never invent credentials.
- Never expose secrets.
- Never overwrite unrelated user data.
- Never force-push.
- Never claim an unverified integration works.
- Never claim tests passed without running them.

If a required external credential is missing, implement the safe integration structure, document the missing configuration, and continue all independent tasks.

# 13. PHASE COMPLETION REPORT

After finishing the desktop application, produce a detailed report.

The report MUST include:

### Project Status
- What was implemented.
- What works.
- What remains incomplete.

### Technical Architecture
- Frameworks.
- Application structure.
- Communication architecture.
- Supabase integration.

### Feature Verification
- PDF import.
- Presentation engine.
- Fullscreen.
- Pairing.
- Security.
- Error handling.

### Testing Results
- Unit tests.
- Integration tests.
- E2E tests.
- TypeScript.
- Lint.
- Production build.
- Security audit.

Provide actual results, not estimates.

### GitHub Status
- Repository URL.
- Branch.
- Latest commit hash.
- Push verification.
- README and banner location.

### Running Instructions
Give exact commands to launch the application locally.

### Remaining Issues
List every known issue and missing configuration.

# 14. HARD STOP — PHASE 1 COMPLETE

Once all desktop work has been completed and verified:

STOP.

Do not create the Android APK.

Do not begin mobile UI implementation.

Do not continue to Phase 2 automatically.

Deliver the completion report to the owner and wait for explicit approval.

The next phase will be:

**PHASE 2 — SIMPLY PPT ANDROID CONTROLLER APK**

---

FINAL OBJECTIVE:

Deliver a real, functional, secure, documented, locally runnable Simply PPT desktop application, with a professional GitHub repository and a verified development workflow.

Quality matters more than pretending to finish quickly.

Build it properly.
