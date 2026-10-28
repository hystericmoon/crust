# Switching on Save to GitHub and Publish

Everything is built. These three steps switch it on. Only you can do them,
because they involve your accounts. Each one works from a phone browser,
though a Mac is more comfortable for step 1. Never paste the token into the
chat.

**Why the steps are needed:**
- **Step 1 (Cloudflare Access)** makes the builder private: only you, signed in with your email, can open it. Until then the save button can't write anything, because the server refuses every request that hasn't been through Access.
- **Step 2 (GitHub token)** lets the builder save your pages to this repository and start a publish.
- **Step 3** tells the builder about both.

## 1. Cloudflare Access (makes the builder private)

1. **Open Zero Trust.** Go to **one.dash.cloudflare.com** and sign in.
   - **First time only:** choose a team name, for example `hosni`, and pick the **Free** plan (free for up to 50 people).
   - **If Cloudflare asks for a payment card:** stop and tell Claude before adding one. Anything that could cost money is your call.
2. **Find the application list.** Go to **Access → Applications** (some versions call it **Access controls → Applications**), then tap **Add an application** and choose **Self-hosted**.
3. **Name and address:**
   - Application name: `Crust admin`
   - Domain: `crust-admin.pages.dev`
   - Add a second domain, `*.crust-admin.pages.dev`, so the preview links are private too.
4. **Policy:** name it `Only me`, set the action to **Allow**, and under **Include** choose **Emails** and enter your email address.
5. **Save** the application.
6. **Copy two values for step 3.** Open the application again and find:
   - **Application Audience (AUD) Tag**: a long string of letters and numbers.
   - **Your team domain**: `<your-team-name>.cloudflareaccess.com`. It's shown under Settings → Custom Pages, or in the browser address bar when you sign in.

## 2. GitHub token (lets the builder save and publish)

1. **Start a new token.** Go to **github.com/settings/personal-access-tokens/new**. This creates a *fine-grained* token.
2. **Name and expiry:**
   - Token name: `crust-admin-save`
   - Expiration: **90 days**. When it expires, saving shows a clear error and you make a new one.
3. **Repository access:** choose **Only select repositories**, then pick **hystericmoon/crust**.
4. **Permissions → Repository permissions:**
   - **Contents: Read and write**, so it can save pages.
   - **Actions: Read and write**, so it can start Publish and read its progress.
   - Metadata is read-only and gets added on its own.
5. **Generate and copy.** Tap **Generate token** and copy it. GitHub shows it only once, so go straight to step 3.

## 3. Tell the builder (Cloudflare Pages settings)

1. **Open the project's settings.** Go to **dash.cloudflare.com → Workers & Pages → crust-admin → Settings → Variables and Secrets**.
2. **Add these three,** for **Production** (and Preview, if it asks separately):
   - `GITHUB_TOKEN`: type **Secret**. Paste the token from step 2.
   - `ACCESS_TEAM_DOMAIN`: type Text, for example `hosni.cloudflareaccess.com`.
   - `ACCESS_AUD`: type Text. Paste the AUD tag from step 1.
3. **Tell Claude "done".** Claude will redeploy (settings take effect on the next deploy) and check that everything works.

## How you'll know it worked

- **Opening the builder** asks you to sign in with your email first.
- **Save draft** says "Page saved to GitHub. Visitors see it after you publish."
- **The page list** shows "Your pages on GitHub", and **Publish site** is available.
- **The first Publish** creates the `crust-site` project and puts the site live at `crust-site.pages.dev`. The address may have a short extra suffix if that name is taken.
