# Changelog

User-visible changes, newest first, in plain language.

## Unreleased

- **Styles panel and Site settings sheet (2026-11-10).** The paintbrush button
  on the left opens one panel for the look of the whole site: Styles cards
  first, then Fine-tune (colours, type, buttons, cards, links, spacing and
  shape, motion, section styles) and Header & footer, with Save and Discard at
  the bottom. Site address, search defaults, where to publish, theme packs and
  Save as template moved to a **Site settings** sheet that opens from the
  Styles and Site panels. It is a real dialog: Escape closes it and focus goes
  back to the button. The old Site settings page still works.

- **Pages panel (2026-11-10).** The Pages button on the left now opens a real
  panel: your pages in two groups, **In the menu** (in the order the menu shows
  them) and **Not in the menu**. Drag a page to reorder it, or to move it
  between the groups; with the keyboard, focus its grip and press the up or
  down arrow, or use Move up and Move down in its **⋯** menu. Each page shows
  its status in words (Live, Edits not live yet, Only in this browser…). The
  ⋯ menu holds Page settings (title, search and sharing), Change address,
  Duplicate, Save to GitHub and Delete. The panel replaces the table on the
  home screen, so the list is the same in both places.

- **Type on the page (2026-11-10).** Click a heading or a text block on the
  page and type right there, with a small bar floating above it. Headings get
  their level (H1 to H4) and Done; text gets bold, italic, link and lists.
  Escape, Done, or a click elsewhere leaves. With the keyboard, select a block
  and press Enter, or use "Type on the page" in its bar; Escape puts focus back
  on the block. Undo covers typing on the page and the side panel alike. The
  side panel and Quick edit stay as they were.
- **One-row section toolbar (2026-11-06).** Select a section and its bar is
  now a single row: **Section** (background picture), **Style** (the four
  colours, each with its name), **Layout** (height), the move arrows, and
  **More**. Arrow keys travel along the row; Escape closes a menu. The
  site-wide actions (change a style everywhere, make linked, save as
  layout) are under More. "Change everywhere" asks first and says how
  many sections it touches. The "This section / Whole site" switch is gone
  from the bar.
- **Add a section by picture (2026-11-06).** The Add button on the left now
  shows small pictures of whole sections (hero, features, pricing…) next to
  your page, with search and categories, so you can see where the section
  will go. Click a picture and it lands after the selected section. The
  "+ Add section" bars between sections choose the spot first and open the
  same panel. Single things like a heading or an image are under "Add an
  element". "See larger" still opens the big gallery with whole pages and
  linked sections. One Undo removes the section you added.
- **Your page first (2026-11-06).** Opening a site takes you straight to
  its Home page in the editor, drawn at full size instead of shrunk to
  57%. The settings panel on the right only appears when you select
  something; the rest of the time the page has the room. The page's title,
  description and search settings are behind the new settings button
  next to the page name. A new site starts with a short "Next steps"
  list that ticks itself off as you go; Skip hides it and Help brings it
  back.
- **One top bar, and changes save on their own (2026-11-06).** Every
  screen has the same top bar: your site's menu on the left, the status
  ("Saved · 3 changes not live") and Publish with its count on the right.
  The editor adds a page switcher, device widths, undo and redo, and
  Preview; a slim icon bar on the left opens Add, Layers, Pages, Styles,
  Media, Blog, Site and Help. "Save draft" is gone: pages and posts save
  a few seconds after you stop typing, or at once with Ctrl/⌘+S.
- **The app in dark and light (2026-11-06).** Crust has a new look: dark
  violet-black or clean white, with the Geist font and violet only on
  what you've selected. It follows your computer's light/dark setting;
  the sun/moon button at the top right switches it and Crust remembers.
  Your site's own colours don't change.
- **The Mac app opens (2026-11-06).** It used to bounce in the Dock and
  never show a window. The app is now signed as one app, so macOS knows
  it is Crust and can ask about the Documents folder; if that folder
  can't be used, Crust keeps your sites in its own folder instead of
  quitting. The first time after downloading, macOS still asks you to
  choose **Open Anyway** in System Settings → Privacy & Security.
- **Review fixes (2026-11-06).** The two buttons in the full-photo hero
  sit together instead of far apart; in the template preview the "Open
  the file" button is a full-size, easy-to-tap button.
- **The store launches free (2026-11-05).** All three templates are free
  to download. The store has one short Licence page ("free to use, on as
  many sites as you like, please don't resell the file"); the Terms and
  Refunds pages and the "Draft" banner are gone until something is priced.
- **Review round fixes (2026-11-04).** Cover cards read on light photos;
  "Undo style" sits right under the Styles intro; the colour dots and
  Sites buttons are easier to tap; tables line figures up under their
  heading and keep opening hours on one line; the Publish screens, FTP
  dialog and first run are calmer and clearer; the store shows bigger
  cards, a calmer heading size and the refund line right under the buy
  button; Harbour's hero text is easier to read and Signal's top bar no
  longer fills a phone screen; images skip a WebP that is bigger than the
  original; the background-video button says Pause or Play.

- **Licence, terms and refunds in the store (F068), as drafts.** Three
  short pages: Licence (use a template for as many sites as you like,
  yours or clients'; don't resell or share the file), Terms (who sells,
  what you get, what happens if something's wrong) and Refunds (full
  refund within 14 days, for any reason; the download page then switches
  off). Every template page links to the full licence, every buy button
  has a line linking all three, and the footer has a "Buying" column.
  Until you approve the wording, each page says "Draft" at the top and
  the store won't take real payments.

- **Template delivery (F067).** After someone pays for a template, they
  get an email with their own download page. The page has a Download
  button, what's new in the latest release, and how to open the file in
  Crust. The link keeps working, so when a template gets an update, buyers
  come back to the same page for the new file at no charge. A full refund
  switches the page off. The download Worker checks every "order paid"
  message against the payment company's secret, so a fake message can't
  get a template. Test orders say "Test order" in the email and on the
  page. It needs a one-time setup from you (docs/setup-delivery.md).

- **Checkout in the store (F066), test mode.** A template with a price gets
  a "Get … · US$49" button that opens the payment company's own checkout
  page (Polar, recommended; Lemon Squeezy also works). They add sales tax
  or VAT, send the receipt and pay you out. The button is a plain link, so
  it works without JavaScript. Until you switch to real payments, a note
  under each button says "Test checkout. No real payment is taken" with the
  test card to use. After paying, buyers land on a new "Thank you" page
  with how to open the template in Crust. Real payments need two things
  from you: live checkout links, and the "Take real payments" switch when
  you run Publish store. Nothing changes on the store until a template has
  a price.

- **Template versions (F065).** A template file now has a name for the
  store (its id) and a version number. When you start from a template, your
  site remembers which one and which version. When the store has a newer
  version of that template, the Templates screen shows a quiet note: "A newer
  “Olive” is available", what changed, and a link to its store page. Nothing
  changes on your site by itself. Template files made before this still open
  as always.

- **Live demos in the store (F064).** Each template page in the store now
  has a "Try the live demo" button. It opens the whole template as a real
  website, every page working (menu, blog, search), under the store's own
  address (`/demos/harbour/`, `/demos/signal/`, `/demos/corner/`). A slim
  dark bar at the bottom says "Live demo of Harbour" and offers "Back to
  store" and "Get this template"; it never touches the template's own
  design or header. Demos are rebuilt every time the store is published,
  so they always match the template file. Search engines are told to list
  the store's pages, not the demo copies.
- **The Crust template store (F063).** A website of its own, made with
  Crust: Home, all templates, a page per template (pictures of its pages
  on a computer and a phone, the price, what's included, counted from
  the template itself, and the licence), Download Crust and Help. It
  lists Harbour, Signal and Corner, free with Crust; premium templates
  join it with a price and a buy button. A new **Publish store** button
  in GitHub Actions puts it online at crust-store.pages.dev and writes
  the list of priced templates the app's gallery will read.
- **Harbour, Signal and Corner, rebuilt (F084).** The three starter
  templates now use the new design layer: each starts from a Style
  library look (Harbour: Atelier · Stone; Signal: Studio · Signal, a dark
  site; Corner: Bistro · Cream), with bundled fonts, display headings and
  small labels, and gentle motion. Every page is full length with
  finished words for a believable business: Harbour has a project
  slider, prices and questions; Signal a top bar, client logos, named
  work tiles, services as tabs and fixed prices; Corner a menu with
  price tables, a workshop price list, opening hours and ordering ahead,
  and its own pages (Menu, Workshops, Our story, News, Visit us). Each
  comes with its own post, blog and "Page not found" design and two
  posts. Made-up names, figures, prices and photos are marked "to
  replace", so they can't go live by accident.
- **Templates keep the new header and footer.** A template file now
  keeps the header's layout, "over the photo", top bar and dropdown
  menus, and a footer made of blocks; before, these were lost.
- **A stricter check before a template is offered (F083).** The template
  check now also stops a template that has leftover builder words
  ("Heading", "Click here", the sample quote), a card, slide or picture
  with no photo while its neighbours have one, photos of very different
  shapes side by side (a portrait next to a landscape), a Home page with
  fewer than five kinds of section, or a section gradient that makes the
  text hard to read. The report says where each one is. Harbour, Signal
  and Corner fail the new checks; they show as notes until they're rebuilt
  (F084).
- **Design the post page, the blog page and "Page not found" (F082).**
  These three now open in the builder like any page. On the **Posts**
  screen, press **Design the blog page** or **Design the post page**;
  "Page not found" is at the end of the **Pages** list. Blue blocks fill
  themselves in: the post's title, date, summary and cover, **Post
  content** (each post's own blocks), the blog's title and intro, and a
  **Post list** (cards, a list, or the newest large; also as "More
  posts" under a post). Add any other blocks around them, like a sign-up
  strip. **Layouts → Starting designs** offers three looks for each
  (nine in all), in your site's colours and fonts. Until you save a
  design, your site keeps today's look, and **Use the built-in look**
  takes you back to it. While you write a post, the canvas shows it
  inside your post design. Templates carry their designs.

- **Lighter photos and a focal point (F081).** Publishing now makes
  **AVIF and WebP** copies of every photo in your Media library (and of
  each smaller copy for phones). Browsers that can read them get those:
  about 40% of the JPEG's size for AVIF, so pages load faster, with
  nothing to set. Unchanged photos aren't made again on the next
  publish. In the media library, each photo now has a **Focal point**:
  press the part of the photo that must stay in view (or use the arrow
  keys), and the three small previews show what a wide, square and tall
  block will keep. Cards, galleries, sliders, section backgrounds and
  every other block that crops the photo keep that part in view, in the
  builder and on the site.

- **Layout library v2 and saved styles (F080).** The layout library has
  **64 new sections** (heroes on full photos, text beside a photo, big
  statements, services as rows, project grids and sliders, figures,
  steps, pricing with a highlighted plan, questions with a heading that
  stays in view, maps with opening hours, and more) and **10 new whole
  pages** (Studio home, Restaurant or shop home, Product landing,
  Services, About, Work, Case study, Pricing, Contact, Venue or event).
  They follow your site's look. Layouts with photos come with sample
  photos that are copied into your Media library and marked "to
  replace", so they can't go live by accident. The first library's
  layouts are still there, under **Simple** in each category. New in
  every block's **Style** tab: **Saved styles**. Save a block's look
  under a name and apply it to another block of the same kind in one
  press. Also: Soft buttons now always keep readable contrast.

- **Slideshow, Card slider, Tabs, Map and a Gallery lightbox (F079).** A
  **Slideshow** shows up to ten photos one at a time, each with an
  optional title, line and link, with back/next buttons and "2 / 5"
  under the photo; swipe on phones. It plays on its own only if you
  switch that on, and then always has a pause button (and never plays
  for visitors who turned on Reduce motion). A **Card slider** is a row
  of up to twelve cards that scrolls sideways, with the next card
  peeking in and arrows above it. **Tabs** show two to eight short texts
  one at a time (underline, pills, or a list on the left). A **Map**
  shows your address, a drawn map in your colours and a "Show map"
  button; the real map (OpenStreetMap) loads only when pressed, and
  "Directions" opens the visitor's maps app. In the builder, type the
  address and press **Find on the map**, or paste a Google Maps link.
  **Galleries** can open photos larger when pressed (on for new
  galleries). Pages without these blocks stay script-free; each block
  works without JavaScript too.

- **Stats, Video, Table, Pricing and numbered lists (F078).** A **Stats**
  block shows two to six big figures with what they count ("300+
  projects finished"), plain, with lines between, or in boxes. A
  **Video** block takes a YouTube or Vimeo link or your own .mp4: it
  shows your cover photo with a play button, and nothing loads from
  YouTube or Vimeo until a visitor presses play. Your own videos can
  have a captions file. A **Table** block is edited as a grid of cells
  in the side panel; paste cells copied from Numbers, Excel or Google
  Sheets to fill it. On phones the table scrolls sideways with the
  first column kept in view. A **Pricing** block shows up to four plans
  as cards, one highlighted with a badge ("Most popular"). **Icon
  lists** can now be numbered (Numbers, in a circle, large "01" or
  plain "1.").

- **Icons, Divider and Social links (F077).** A new **Icon** block: pick
  from about 150 icons by searching what you mean ("food", "phone",
  "delivery") or by category; show it plain, in a circle or in a square,
  in three sizes, optionally as a link. **Icon lists** can now use any
  icon, for the whole list or per line. A **Card** can show an icon
  instead of a photo, and a **Button** can have an icon before or after
  its label. A **Divider** block draws a thin line, a short bar, a line
  with a label ("Our menu"), or three dots. A **Social links** block
  turns pasted profile addresses into the right network icons
  (Instagram, LinkedIn, TikTok and 13 more), icons only or with names.
  Icons are drawn into the page (nothing extra to download) and take
  the section's colours. An icon that is a link needs a name for screen
  readers; publishing waits until it has one.

- **Header and footer v2 (F076).** Site settings → Header & menu now
  has six **layouts** (Classic, Centred menu, Logo on top, Split, Left
  together, Menu button only), **dropdown menus** ("Put under above"
  makes one, "Take out" undoes it; opened by click, tap or Enter,
  closed with Escape), a **top bar** above the header (a short message,
  a link, a phone number or email), and **Clear on a hero photo**: the
  header sits on any page that starts with a photo or video section.
  On phones, menus with a new layout or a dropdown open as a **panel
  from the side** (Close, or tap outside). Site settings → Footer can
  now be **built from blocks**: a linked section you edit in the
  builder ("Make one from my simple footer" starts it from what you
  have). Existing headers and footers look the same until you use
  these.

- **Motion (F075).** Site settings has a new **Motion** group: Off
  (as before), Subtle or Lively. With motion on, sections ease into
  place as visitors scroll to them, rows of columns, cards and photos
  come in one after another, photos fade in, and cards and buttons that
  link somewhere lift under the pointer (and on keyboard focus). A
  Section's **Style** tab can pick another entrance (Rise, Zoom, Slide
  in) or none, and photo backgrounds can **move slower** (parallax). A
  **Logo row** can scroll slowly, with a pause button; it stops while
  the pointer or keyboard is on it. Words never fade, so they stay
  readable wherever a visitor stops. Visitors with Reduce motion on see
  a still page, and the builder always stays still. No scripts are
  added to the site. Existing sites stay still until you turn it on.

- **Columns that look designed (F074).** A Columns row's **Style** tab
  now has **Line up** (Top, Middle, Bottom), **boxes** behind every
  column in one of your section styles (padding S, M or L, rounded or
  square), a **highlighted column** in another style for pricing or a
  "most popular" choice, **dividers** between columns, **last column
  first on phones** (so a photo leads), and **keep a column in view**
  while a longer one scrolls past on wide screens. Advanced adds a
  separate gap between rows. Screen readers and the Tab key always
  follow the written order. Existing rows look the same until you use
  these.

- **Sections that reach the edge, move and overlap (F073).** A
  Section's **Style** tab now has three groups. **Layout**: width as
  Narrow, Normal, Wide, Full, or reaching the left or right edge of the
  screen while the text stays on the page grid. **Background**: Colour,
  Gradient (ending in a site colour; only colours that keep the text
  readable are offered), Photo with a **focal point** (click the photo or
  use the sliders) that phones keep in view, or a silent looping
  **Video** with a pause button. Visitors with Reduce motion on see the
  still photo instead. **Over and under**: pull a section up over the
  one above, for cards that overlap a photo, and let the **header sit
  on the first section** in that section's colours. Existing pages look
  the same until you use these.

- **A style library (F072).** Site settings → **Styles** now offers
  12 complete looks, such as Atelier, Studio, Maison, Clinic and
  Bistro, each in three colourways. A look sets fonts, headings, small
  labels, buttons, cards, links and corners in one go; your pages,
  spacing and page width stay as they are. Each card is drawn in its
  own look, and the dots under it switch colourway. "Undo style" takes
  you back to how the site looked before you started trying looks. The
  looks replace the 9 colour presets; sites that used a preset keep
  their colours.

- **Display headings, small labels, more buttons and photo cards
  (F071).** A Heading can now be **Display** size, a step above H1, and
  can have a **small label above** it, like "ARCHITECTURE STUDIO".
  Site settings → Typography sets how they look everywhere: Display
  weight (now down to Light and Regular) and letter spacing (now down to
  Tighter and Tightest), and labels as Plain, Caps, Mono or Chip. Buttons
  gain **Soft** (a tinted fill) and **Text with arrow**; "Secondary" is
  now called **Outline**. A Card can be **Photo fills the card**, with
  its words on a dark band over the photo. Smaller headings (H3, H4)
  never go thinner than Medium, so they stay easy to read. Nothing
  changes on your pages until you use these. The sample site's home
  page now shows a Display heading with a chip label.

- **Real fonts (F070).** Site settings → Typography now has 32
  typefaces that ship with Crust, among them Fraunces, Geist, Instrument
  Serif, Bodoni Moda and DM Sans. Pick one of 12 tested **font pairs**:
  each card is set in its own fonts. Or change the heading and body font
  separately from lists grouped by Serif, Sans serif and Monospace, each
  name shown in its own font. The fonts are published with your site,
  so visitors' browsers never contact Google and there's nothing to
  consent to. Only the fonts you use are published, and the screen says
  how much they add (about 70–120 KB, once per visitor). Fonts made for
  headings, like Bodoni Moda, aren't offered for body text. Sites keep
  their current fonts until you pick new ones. The sample site now uses
  the Editorial pair (Fraunces and Inter Tight); the live site changes
  only when you publish.

- **Premium templates in the template gallery (F062).** Pages → Start
  from a template now has two groups: **Free** (the starters, as
  before) and **Premium**, templates from the Crust store with the price
  on each card. A premium template opens the same preview as a free one,
  with pictures of its pages at desktop, tablet and phone width, and a
  **Get this template** button that opens the store in your browser.
  Already bought one? **Open the file** right there. Without internet,
  the gallery shows the free templates and one line saying premium ones
  show when you're online. The store isn't open yet, so for now you can
  see it with examples: add `?examples` to the gallery's address
  (`#/templates?examples`).

- **The app keeps itself up to date (F061).** Crust checks for a new
  version a little after it opens (at most once a day), downloads it in
  the background, and installs it the next time you open Crust, so an
  update never interrupts your work and never touches your sites. When
  one is ready, the Pages and Sites screens say so: **Restart now** to
  get it straight away, **What's new** for the list of changes, or
  **Later**. The Sites screen has a **Crust** card with the version and
  **Check for updates**. Updates are signed, and Crust refuses any that
  aren't. Needs the update key to be set up first
  (`docs/setup-updates.md`); until then the app says it doesn't update
  itself.

- **A welcome screen the first time the app opens (F060).** A brand new
  Crust greets you with one screen: pick a start (Harbour, Signal,
  Corner, or Blank), check the site's name (it suggests one), and press
  **Make my site**. You land in the builder on the Home page with the
  **To replace** list already open, showing the sample words and photos
  to swap for your own. No account, nothing to connect. It shows only
  once; after that the app opens straight into your site. Everything
  works with the keyboard (arrow keys move between the starts, Enter
  makes the site).

- **Publish to your own web host by FTP or SFTP (F059).** In the app,
  the Publish card has a third choice, **Your own web host**, for the
  hosting you already pay for. Fill in the details from your host's
  welcome email (SFTP, FTPS or FTP; server; username; password; the
  folder, often public_html; and the site's address) and press **Check
  and connect**: Crust signs in and checks it can save files there
  before anything is kept. Then **Publish** sends only the files that
  changed since last time, and removes pages you deleted (it never
  touches files it didn't put there). Plain FTP works but warns that the
  password travels unencrypted. The password stays in your computer's
  keychain. For SFTP, Crust remembers the server's key and stops if it
  ever changes. **Send every file next time** (under Change or
  disconnect) is there for when files were changed on the server by
  hand.
- **Publish to Cloudflare Pages or Netlify (F058).** In the app, the
  Publish card now offers both hosts. Press one, follow the four steps
  to make a token on the host's website (a button opens the right page),
  paste it, and pick your address, e.g. harbour-studio.pages.dev. From
  then on **Publish** puts the site online in one press and shows how far
  the upload is; only changed files are sent. The token stays in your
  computer's keychain, never in the site folder, so a duplicated or
  shared site never carries it. If the token expires, Publish says so
  and lets you paste a new one. **Change or disconnect** moves the site
  to another address or host. Export site folder and Preview in browser
  are still there, under "Or keep it on this computer".
- **Several sites in the app (F057).** Keep one site per client. The
  Pages screen has an **All sites** link that opens **Your sites**: every
  site with its page count and when it was last edited, the open one
  marked "Open". From there: **New site** (name it, and it opens with a
  Home page), **Rename**, **Duplicate** (same pages, photos and history,
  but no site address or publish settings, so it never publishes over
  the original) and **Delete**. A deleted site waits in **Recently
  deleted** for 30 days and can be restored; your live website is never
  touched. Each site is its own folder in Documents → Crust, and the app
  opens the one you used last.
- **Publish on your computer (F056).** In the app, the Publish card on
  the Pages screen has two buttons. **Preview in browser** builds your
  whole site (pages, blog, photos in every size, site search) and opens
  it in Safari or Chrome, exactly as visitors will see it; anything that
  would stop a publish is listed underneath, but you still see the site.
  **Export site folder** asks where to put it and writes a finished
  website folder ("Harbour Studio website") that you can upload to any
  web host. Exporting again asks before replacing the earlier export.
  It's the same result as publishing from crust-admin. Publishing
  straight to a host comes next (F058, F059).
- **Crust as an app for Mac and Windows (F055, first step).** The builder
  can now run in its own window instead of a browser. Your site is kept
  in a folder on your computer (Documents → Crust → My site), and every
  save is kept there too, so going back works as on the web. Nothing
  needs GitHub or an account. The first time it opens, it starts a new
  site with a Home page. Publishing from the app comes next (F056).
  Installers are made by hand for testing and are not signed yet, so
  your Mac will ask you to confirm the first time (right-click → Open).

- **Signal and Corner have real photos (F053).** Signal opens dark on a
  full-width concert photo, shows work as photo tiles with the project
  name on each, and has a full-width photo band with one big line.
  Corner opens with the headline on butter yellow and a photo beside it,
  then three product cards with photos, a workshop band and the shop
  front on the Contact page. Both journals' first post has a cover
  photo. Every photo and sample line is still marked "Replace me".
- **Card photos keep their shape.** A card using a photo from the
  library no longer stretches as tall as the photo; it stays 16:9.
- **Fixes from the review (F069):**
  - *Keyboard:* the "Blocks / Outline" switch on the left of the builder
    works with Tab and Enter, and a "Skip to page" link (first Tab
    press) jumps straight to the first block. After closing a question
    (Publish, Rename, Delete) or pressing "Undo preset", the keyboard
    lands back where you were instead of at the top of the screen.
  - *Blog posts* keep their text inside the page's margins, like pages,
    in every template. A block added from the block list with nothing
    selected now goes into the last section instead of below it.
  - *Template previews* show a real screen's height and scroll inside,
    so Harbour's opening photo and headline are visible at once.
  - *No more sideways jump:* the Section toolbar wraps onto two rows
    inside the page preview, and "Make linked" / "Save as layout" open
    inside it.
  - *When something fails:* a save that didn't reach GitHub stays on
    screen in red with "Try again" (it used to look like a success and
    vanish). "Publishing started…" goes away once the publish finishes,
    and a failed publish offers "Try again".
  - *Contact form:* if a message can't be sent, what the visitor typed
    stays in the form and the message says what to fix (for example
    "“Email” doesn't look like a complete email address"), with the
    cursor in that field. Still works without JavaScript.
  - *Renaming a page* also updates its links in the site header menu,
    footer and blog posts, and the message says how many links changed.
  - *Photos:* picking a library photo for a newly added Image block
    fills in its description.
  - *Smaller things:* page addresses no longer break mid-word; a page
    isn't counted twice in "Publish N changes"; the purple "Site header"
    label no longer covers the menu; clicking the header links or
    copyright in the Site settings preview picks the right colour;
    search results and post titles use your site's link style and
    search moves focus to the results; Sign out sits at the far end of
    the top bar; the rich text box isn't cut off at the right; "To
    replace" follows page order and its tags don't cover the words;
    theme import lists each contrast problem once; "1 layout"; setting
    labels look the same; the phone photo picker names the block.

- **Groundwork for the Crust app (F054):** the builder can now keep a
  site in a folder on a computer, with every save kept, instead of on
  GitHub. Nothing changes in the web admin; the desktop app (F055) is the
  first thing to use it.

- **Harbour, reworked (F052):** the first starter template now opens
  with a full-width photo behind the headline, shows recent work as a
  tall photo beside two wide ones, puts short statement lines between
  the photo sections and uses quiet underlined links instead of most
  buttons. Ten real public-domain photos replace the stand-in shapes
  (still marked Replace me), and the home page gets a journal cue and a
  "we're hiring" line. Signal and Corner are unchanged.

- **Third starter template, Corner (F051):** the same pages again, warm
  and local: a sturdy serif, navy on butter yellow, rounded buttons,
  flat cards and highlighter-style links. All three starter templates
  are now in **Start from a template**.

- **Second starter template, Signal (F050):** the same pages as
  Harbour with a bold look: heavy geometric headings, a dark opening
  section, one burnt-orange accent, pill buttons and soft-shadow cards.

- **First starter template, Harbour (F049):** a complete site to start
  from: Home, About, Services, Work, Contact, a Journal with one post,
  and a contact strip shared by every page. Calm serif headings, deep
  green on warm paper. Every sample word and image is marked "Replace
  me" and written as a short instruction ("A short line on this
  service…"), and the images are simple stand-ins in the template's own
  colours. It's first in **Start from a template**. Signal and Corner
  follow.

- **Start from a template (F048):** the Pages screen has **Start from a
  template**. Pick one from the gallery (or open a .crust file), look
  through every page and post at desktop, tablet and phone widths, with
  sample content outlined. **Use this template** asks first and lists
  exactly what's replaced (your pages by name, posts, style, header and
  footer) and what's kept (site name and address, photo library, saved
  layouts, the live site until you publish). Afterwards the Pages screen
  offers **Bring back my previous site**.

- **Template quality check (F047):** one check a template must pass
  before it's offered: it opens, text reads in every section style,
  every page has one main heading with headings in order, photos are
  described, axe finds no serious accessibility issue at desktop, tablet
  and phone widths, the home page scores 95+ for speed, every saved
  layout renders, and no lorem ipsum or stand-in photo slipped through
  unmarked. It runs on every pull request and writes a readable report
  page (a download on the CI run).

- **Sample content to replace (F046):** a template's sample words and
  photos can be marked "Replace me" (any block's **Advanced** tab). In
  the builder they get a dashed outline and a label, and a **To replace**
  button lists them, with **Show** and **Keep as is**. Changing the words
  or the photo clears the mark by itself. The Pages screen shows how many
  are left on each page, and publishing waits until none are left, so a
  first publish never shows a template's sample text or photos.

- **Save a site as a template (F045):** Site settings → **Template**.
  Give it a name and a short description, press **Save as template**,
  and the whole site downloads as one .crust file: pages, linked
  sections, saved layouts, blog, the photos they use, and the style,
  header and footer. Crust checks the file before it downloads, and
  lists anything that stops the site being a template (for example, no
  Home page). Starting a site from a template comes next.

- **Your own domain (F044):** Site settings has a new **Site address**
  group. Type your domain (like studio.com), save and publish: search
  results, the sitemap, link previews, the blog's RSS feed and the "Open
  live site" button all use it. Until the domain is connected in
  Cloudflare, publishing keeps using the free address and the Publish
  panel tells you so. Step-by-step guide: docs/setup-custom-domain.md.
- **Linked sections (F043):** make a section once and show it on many
  pages. Select a section and press **Make linked** on its toolbar; add
  it to other pages from **Layouts → Linked**. Selecting it shows which
  pages use it, with **Edit linked section** (its own screen: one save
  updates every page) and **Unlink here** (a normal copy on that page
  only). A linked section can't be deleted while a page still uses it.
- **Rich text in Text blocks (F042):** make words **bold** or *italic*,
  add links, and write bulleted or numbered lists. The Text field has a
  small toolbar, in the builder and in Quick edit on your phone, plus
  shortcuts: ⌘B, ⌘I, ⌘K for a link, ⌘⇧8 / ⌘⇧7 for lists, or type "- "
  or "1. " to start a list. Links are checked, so only page addresses,
  web, email and phone links are allowed, and renaming a page updates
  links in text too. Text you already wrote keeps looking the same.
- **Layouts for the new blocks (F041):** six more ready-made sections
  in Layouts: a Features grid, a Photo gallery, a Logo strip, a
  Testimonial, Questions that open (FAQ) and a Contact form beside your
  details. Two new categories, Gallery and Logos. Photo and logo spots
  show as grey boxes until you add your own, and each photo asks for a
  description before it can go live.
- **Builder tidy-up (F040):** a **Sign out** link on the Pages screen
  and in the builder's top bar (pages and posts). Nothing is lost when you sign out: your edits
  are already kept in the browser. Restoring a deleted page that had
  been renamed now brings back its old address too, so old links and
  bookmarks lead to it again. And the builder itself now passes the
  accessibility checks: the preview, the zoom menu and the loading
  spinner have names screen readers read out, and the "Layout" /
  "Content" headings in the block list are darker and easier to read.

- **Site search (F039):** your site now has a search page at /search/.
  Visitors type a word and see matching pages and posts, with the words
  highlighted. Add a "Search" link to your header in Site settings →
  Header & menu. Built when you publish; no server, no cost.

- **Quick edit on your phone (F038):** open a page on your phone and you
  get a simple form with its words, button labels and photos, in page
  order. Fix a typo or swap a photo, then press Save, or Save and
  publish. "Full builder" is one tap away if you need layout. On a
  computer, the builder has a "Quick edit" link too.

- **Contact form (F037):** a new Contact form block (block list → Forms).
  Visitors send you a message with their name, email and anything else
  you ask for; it arrives in your inbox, and spam is kept out. Works on
  any phone, even without JavaScript. It needs a one-time setup with
  free accounts before it can send (docs/setup-contact-form.md); until
  then the form says it isn't connected yet.

- **Search and sharing (F036):** in each page's settings, set the title
  people see in search results, a picture for when the link is shared,
  or hide the page from search engines. Live previews show how it will
  look in Google and in a chat message. Every page now shares nicely by
  default (title, description and address), and blog posts use their
  cover photo.

- **Blog (F035):** a new Posts screen (link next to Pages). Write news,
  notes or portfolio pieces in the builder, with a title, summary, date
  and cover photo. Your site gets a list of posts at /blog/, a page for
  each post, and an RSS feed so people can follow along. Rename the list
  page (e.g. "News") on the Posts screen, and add /blog to your menu in
  Site settings.

- **Media library (F034):** every image field now has "Choose image".
  Upload photos from your Mac or phone (button or drag and drop), find
  them again by searching, and pick one from a grid. Each photo needs a
  short description (alt text) before it can be used; it's filled into
  the block for you. Big photos are shrunk to 2400 px before upload, and
  hidden location details are removed. Photos are kept in GitHub next to
  your pages. On the published site, phones get smaller copies of each
  photo automatically. Pasting a web address still works.

- **Theme packs (F033):** Site settings → Theme pack. Download your
  site's look (style, header and footer look, My layouts) as one .crust
  file, and bring one into another Crust site. A pack is checked first
  (format and contrast) and shown in the preview; nothing changes until
  you choose "Use this theme", and the style still waits for Save.

- **More elements (F032):** seven new blocks.
  - **Grid of cards:** a row of cards (2–4 per row) you fill in one list.
  - **Gallery:** photos in a grid, square, wide or as uploaded, with
    captions.
  - **Accordion / FAQ:** questions that open to show the answer; choose
    to open the first one, or keep only one open at a time.
  - **Icon list:** lines with a check, arrow, star, dot, plus or heart.
  - **Logo row:** client or partner logos, optionally grey until hovered
    and linked.
  - **Quote:** a testimonial with name, role and photo.
  - **Image overlay:** a title, text and button on a photo, with a tint
    that keeps the text readable.
  - Repeating items (cards, photos, questions…) are edited in a list with
    arrow buttons to reorder, so it all works from the keyboard.

- **Header, footer and menu (F031):** Site settings has two new groups.
  **Header & menu:** your logo (name or image), a menu built from your
  pages (reorder with the arrow buttons), an optional button at the end,
  and "keep at the top while scrolling". On phones the menu folds into a
  Menu button that works without JavaScript. **Footer:** a short line
  about you, up to 4 columns of links, and a copyright line where {year}
  and {name} fill themselves in. Both show on every page, with a "Skip to
  content" link for keyboard users. Existing sites get a sensible header
  and footer automatically.

- **Content, Style and Advanced (F030):** each block's settings are split
  into three tabs at the top of the panel, so simple edits stay simple.
  Advanced holds Show on, spacing, and a new **anchor name**: name a
  block "team" and a button linking to #team jumps straight to it.

- **Per-device columns (F029):** a Columns block now has widths for
  desktop, tablet and phone, side by side in the panel (for example 2/3
  + 1/3 on desktop, stacked on phone). Click a device name to preview it.
- **Show on:** any block can be hidden on desktop, tablet or phone. In
  the builder it stays visible but faded and labelled, so you can still
  select it; visitors on that device don't see it. No JavaScript.

- **Style customizer (F028):** Site settings show one group at a time
  next to the preview, with new groups:
  - **Typography:** heading sizes (Subtle to Dramatic), weight and letter
    spacing.
  - **Buttons:** shape (Square, Rounded, Pill) and the main button
    (Solid, Outline or the new Soft).
  - **Cards:** Flat, Outline or Shadow. **Links:** Underline, Thick or
    Highlight (always underlined).
  - **9 presets** that set the whole look, including 4 new ones (Ocean,
    Studio, Paper, Night). One Undo takes a preset back.
  - Click a button, card or heading in the preview to jump to its
    settings. Your current site looks exactly the same until you change
    something.

- **My layouts (F027):** keep any section, or a whole page, to reuse.
  - Select a section and choose **Save as layout** on its toolbar. It's
    named after its heading; change the name if you like.
  - Open **Layouts → My layouts** to add one, or to save the whole page.
  - Rename or delete with the **⋯** button on each card. Saved layouts
    are copies: renaming or deleting one never changes your pages.
  - Saved to GitHub (content/layouts/); kept in this browser until saving
    to GitHub is switched on.

- **Layout library (F026):** 20 designed sections and 5 whole pages,
  ready to drop in.
  - Hover the page in the builder and click a **+** between sections, or
    use **Layouts** in the top bar (adds after the selected section).
  - A large gallery opens with **Sections / Whole pages**, categories and
    search. Previews show your own site style.
  - Everything uses your site style, so it matches straight away; a page
    keeps one main heading. One Undo takes it back out.
  - A new, empty page shows an **Add a layout** button in the middle.

- **Tooltips on icon buttons in the builder** (Duplicate, Delete, Select
  parent, the move arrows, the style dots): they show on hover and on
  keyboard focus, and Escape closes them.

- **Section styles (F025):** sections can be Page, Muted, Primary or Dark,
  with a height (Auto to Full screen), content position, and a background
  image with a tint that keeps text readable.
  - Pick them from picture tiles in the side panel, or from a quick
    toolbar on the selected section.
  - Flip the toolbar to **Whole site** (or click **Edit everywhere**) to
    change what a style looks like on every page at once. Also in Site
    settings → Section styles.
  - Text colour picks itself, so every style passes contrast checks.

- **Unknown addresses show "Page not found"** with a link to the home
  page, instead of the home page itself. Deleted pages now really
  disappear from the live site.
- **Saving and publishing are switched on for real.** The builder asks
  you to sign in, saves to GitHub, and the site is live at
  https://crust-site.pages.dev.

- **Each page shows one status:** only in this browser, changes not
  saved, saved but not live yet, or live.
- **Publishing offers to save browser drafts first,** so nothing you meant
  to publish gets left behind.
- **"Find a page" and "Sort by"** (newest edit or address) once you have
  6 or more pages.
- **"Publish (3)" in the builder and Site settings top bars** takes you
  straight to the Publish panel.
- **Pages screen polish** after an Impeccable design review:
  - Publish now sits at the top, and its button says what it will do
    ("Publish 3 changes", or "Publish again" when everything is live).
  - Keyboard focus no longer hides under the top bar.
  - Clearer errors, with a "Try again" button.
  - New page keeps what you typed if you close it.
  - A few wording and spacing fixes.
- **"Save to GitHub" on pages marked "Draft in this browser",** so you can
  save a draft from the page list without opening it.
- **"Recently deleted"** under your page list: bring a deleted page back at
  its old address with one button.
- **Renaming a page also updates the buttons and card links on your other
  pages** that point to it. The rename dialog lists which pages will change.
- **"Open live site" now opens your real site,** at the address the last
  publish went live at, which is also shown under the button. Before the
  first publish, the panel says the link will appear there.
- **Rename and delete pages** from the page list. Each asks for confirmation
  first.
  - **Renamed pages keep working at their old address:** visitors are sent
    to the new one once you publish.
  - **The Home page can't be renamed or deleted.**
- **See what isn't live yet.**
  - The page list marks saved pages as "Not published yet" or "Edited since
    publish".
  - The Publish panel lists everything the next publish will change: new,
    edited, moved and removed pages, plus Site settings.
- The admin opens on your page list: titles, addresses and when each was
  last edited. "New page" creates a page (the address fills in from the
  title) and opens it in the builder. Page title and description are edited
  in the builder's page panel.
- "Publish site" (on the page list) puts your saved pages live and shows
  progress. It switches on together with saving to GitHub.
- Every published page is checked for accessibility (axe) before it goes
  live, and the sample page for speed (Lighthouse).
- Save draft and Site settings → Save now save to GitHub once it's switched
  on, with a clear message about where your work went. Until then they keep
  saving in your browser.
- In Site settings, click any part of the preview to jump straight to the
  colour that styles it.
- Site settings has five ready-made presets (Crust, Ink, Forest, Sunset,
  Mono) for colours and fonts, with one-step undo.
- Buttons can be aligned left, centre or right, so they line up under
  centred headings.
- Publishing also stops when an Image block has no image URL, instead of
  putting the "Add an image URL" placeholder on your live page.
- The builder works fully from the keyboard: select blocks with Enter, move
  them with Alt and the arrow keys (also as buttons on the selected block),
  and add blocks from the list with Enter. Screen readers hear what moved
  where. Press ? or "Keyboard" for the list of shortcuts.
- The builder's "Publish" button is now "Save draft" (that's what it does
  until publishing arrives), and it can be reached with Tab.
- Site settings: set the site's colours, fonts, spacing, corner radius and
  page width in one place, with a live preview of your Home page. A
  contrast check flags colour pairs that are hard to read and offers a
  one-click fix. Open it from "Site settings" in the builder's top bar.
- New blocks: Columns (2, 3 or 4; they stack on phones and show 2 on
  tablets) and Card (image, title, text and a link).
- The builder canvas now uses your body font, so the preview matches the
  published page.
- Publishing now stops, with a plain list of what to fix, when a page has an
  image without alt text, no main heading (H1) or more than one, a heading
  that skips a level (H2 → H4), or a missing title or description.
- Every branch now gets its own preview link of the builder, posted on its
  pull request and in the GitHub Actions summary. `main` is the stable
  preview. (Live once the Cloudflare secrets are added.)
- First version of the builder: add, reorder and edit blocks (Section,
  Heading, Text, Image, Button, Spacer) and switch between desktop, tablet
  and mobile widths. Drafts are saved in your browser for now.
- Publishing pipeline: pages become plain HTML files with your design tokens,
  plus a sitemap and robots.txt for search engines.
- Project set up: product spec, feature list, and the workflow files that
  guide every build session.
