// @vitest-environment happy-dom
/** F058: publish to Cloudflare Pages or Netlify (design/f058-publish-to-host-v1.html, A). */
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BuildReport, LocalPublisher } from "../desktop/local-publish";
import { DesktopPublishPanel } from "./DesktopPublishPanel";
import { HostPublish, problemList } from "./HostPublish";
import {
  addressProblem,
  asHostFailure,
  describeProgress,
  ftpProblems,
  HostFailure,
  productName,
  hostsApi,
  tidyAddress,
  whenPublished,
  type HostConnection,
  type HostsApi,
  type HostStatus,
} from "./hosts";

afterEach(cleanup);

const report = (over: Partial<BuildReport> = {}): BuildReport => ({ pages: 8, photos: 10, searchable: 9, redirects: 0, problems: [], ...over });

const connection = (over: Partial<HostConnection> = {}): HostConnection => ({
  host: "cloudflare",
  accountName: "Hosni",
  project: "harbour-studio",
  url: "https://harbour-studio.pages.dev",
  lastPublished: null,
  hasToken: true,
  ...over,
});

function fakeHosts(status: HostStatus, over: Partial<HostsApi> = {}): HostsApi {
  return {
    status: vi.fn(async () => status),
    checkToken: vi.fn(async () => [{ id: "acc1", name: "Hosni" }]),
    connect: vi.fn(async (host, _token, account, name) => connection({ host, accountName: account.name, project: name, url: `https://${name}.pages.dev` })),
    connectFtp: vi.fn(async (settings, _password, url) => connection({ host: "ftp", accountName: `${settings.username}@${settings.server}`, project: settings.server, url, ftp: settings })),
    replaceToken: vi.fn(async () => connection()),
    resendAll: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    openTokenPage: vi.fn(async () => undefined),
    openSite: vi.fn(async () => undefined),
    publish: vi.fn(async (onProgress) => {
      onProgress({ done: 0, total: 2 });
      return { published: { url: "https://harbour-studio.pages.dev", uploaded: 2, files: 30 }, report: report() };
    }),
    ...over,
  };
}

const notConnected: HostStatus = { connection: null, suggestedName: "harbour-studio" };

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const click = async (name: RegExp | string, root: HTMLElement = document.body) => {
  await act(async () => {
    fireEvent.click(within(root).getByRole("button", { name }));
  });
};

const type = async (label: RegExp | string, value: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
};

const submit = async (name: RegExp | string) => {
  await act(async () => {
    fireEvent.submit(screen.getByRole("button", { name }).closest("form")!);
  });
};

describe("hosts: plain words", () => {
  it("checks addresses", () => {
    expect(addressProblem("cloudflare", "harbour-studio")).toBeNull();
    expect(addressProblem("cloudflare", "")).toBe("Type an address.");
    expect(addressProblem("cloudflare", "Harbour")).toBe("Use only lowercase letters, numbers and dashes.");
    expect(addressProblem("netlify", "-harbour")).toBe("Don't start or end the address with a dash.");
    expect(addressProblem("cloudflare", "a".repeat(59))).toMatch(/at most 58/);
    expect(addressProblem("netlify", "a".repeat(63))).toBeNull();
  });

  it("tidies an address as you type", () => {
    expect(tidyAddress("Harbour Studio")).toBe("harbour-studio");
    expect(tidyAddress("Rina's  café_2")).toBe("rinas-caf-2");
  });

  it("says how far an upload is", () => {
    expect(describeProgress(null)).toBe("Building your site: pages, photos, search…");
    expect(describeProgress({ done: 14, total: 38 })).toBe("Uploading 14 of 38 files…");
    expect(describeProgress({ done: 0, total: 1 })).toBe("Uploading 0 of 1 file…");
    expect(describeProgress({ done: 0, total: 0 })).toBe("Nothing new to upload. Finishing…");
    expect(describeProgress({ done: 3, total: 3 })).toBe("Finishing…");
  });

  it("says when the site was last published", () => {
    const now = new Date(2026, 10, 1, 12, 0).getTime();
    expect(whenPublished(new Date(2026, 10, 1, 9, 41).getTime(), now, "en-GB")).toBe("today, 9:41");
    expect(whenPublished(new Date(2026, 9, 31, 18, 2).getTime(), now, "en-GB")).toBe("yesterday, 18:02");
    expect(whenPublished(new Date(2026, 9, 30, 9, 41).getTime(), now, "en-GB")).toBe("30 Oct, 9:41");
  });

  it("reads the app's refusals", () => {
    const f = asHostFailure({ kind: "taken", message: "“harbour” is taken on Netlify.", suggestion: "harbour-2" });
    expect(f).toBeInstanceOf(HostFailure);
    expect([f.kind, f.message, f.suggestion]).toEqual(["taken", "“harbour” is taken on Netlify.", "harbour-2"]);
    expect(asHostFailure("plain words").kind).toBe("other");
    expect(asHostFailure(new Error("boom")).message).toBe("boom");
    expect(problemList("Nothing was published. Fix this:\n  - Page /: no title")).toEqual({ lead: "Nothing was published. Fix this:", items: ["Page /: no title"] });
  });
});

describe("hosts: talking to the app", () => {
  it("calls the app's commands with their arguments", async () => {
    const invoke = vi.fn(async (cmd: string) => (cmd === "host_check_token" ? [{ id: "a", name: "A" }] : null));
    const api = hostsApi(invoke, async () => () => {}, async () => report());
    await api.status();
    await api.checkToken("netlify", "t");
    await api.connect("cloudflare", "t", { id: "a", name: "A" }, "harbour");
    await api.replaceToken("t2");
    await api.disconnect();
    await api.openTokenPage("cloudflare");
    await api.openSite();
    expect(invoke.mock.calls).toEqual([
      ["host_status", undefined],
      ["host_check_token", { host: "netlify", token: "t" }],
      ["host_connect", { host: "cloudflare", token: "t", account: { id: "a", name: "A" }, name: "harbour" }],
      ["host_replace_token", { token: "t2" }],
      ["host_disconnect", undefined],
      ["host_open_token_page", { host: "cloudflare" }],
      ["host_open_site", undefined],
    ]);
  });

  it("publish: builds with the checks on, listens for progress while uploading, then stops listening", async () => {
    const stop = vi.fn();
    let handler: ((p: unknown) => void) | null = null;
    const listen = vi.fn(async (_event: string, h: (p: unknown) => void) => {
      handler = h;
      return stop;
    });
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === "host_status") return { connection: connection({ url: "https://x.pages.dev" }), suggestedName: "x" };
      handler?.({ done: 1, total: 2 });
      return { url: "https://x.pages.dev", uploaded: 2, files: 9 };
    });
    const build = vi.fn(async (_hostUrl?: string) => report());
    const seen: unknown[] = [];
    const out = await hostsApi(invoke, listen as never, build).publish((p) => seen.push(p));
    expect(build).toHaveBeenCalledWith("https://x.pages.dev");
    expect(listen.mock.calls[0]?.[0]).toBe("host-progress");
    expect(invoke).toHaveBeenCalledWith("host_publish", undefined);
    expect(seen).toEqual([{ done: 1, total: 2 }]);
    expect(out.published.url).toBe("https://x.pages.dev");
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("publish: page problems stop it before anything is uploaded", async () => {
    const invoke = vi.fn(async (cmd: string) => (cmd === "host_status" ? { connection: connection(), suggestedName: "x" } : null));
    const build = vi.fn(async () => {
      throw new Error("Nothing was published. Fix this problem:\n  - Page /about/: An image has no description.");
    });
    const failure = await hostsApi(invoke, async () => () => {}, build)
      .publish(() => {})
      .catch((e) => e);
    expect(failure.kind).toBe("problems");
    expect(invoke).not.toHaveBeenCalledWith("host_publish", undefined);
  });

  it("publish: refuses a site that isn't connected", async () => {
    const invoke = vi.fn(async () => ({ connection: null, suggestedName: "x" }));
    const build = vi.fn();
    const failure = await hostsApi(invoke, async () => () => {}, build)
      .publish(() => {})
      .catch((e) => e);
    expect(failure.kind).toBe("disconnected");
    expect(build).not.toHaveBeenCalled();
  });

  it("a refused upload still stops listening", async () => {
    const stop = vi.fn();
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === "host_status") return { connection: connection(), suggestedName: "x" };
      throw { kind: "token", message: "Cloudflare no longer accepts the saved token." };
    });
    const failure = await hostsApi(invoke, async () => stop, async () => report())
      .publish(() => {})
      .catch((e) => e);
    expect(failure).toBeInstanceOf(HostFailure);
    expect(failure.kind).toBe("token");
    expect(stop).toHaveBeenCalledTimes(1);
  });
});

describe("hosts: the Publish card before connecting", () => {
  it("offers the two hosts, with export and preview stepping back", async () => {
    const publisher: LocalPublisher = {
      preview: vi.fn(),
      exportSite: vi.fn(),
      replaceExport: vi.fn(),
      showExport: vi.fn(),
      buildToPublish: vi.fn(),
    };
    render(<DesktopPublishPanel publisher={publisher} siteUrl="https://harbour.example" hosts={fakeHosts(notConnected)} />);
    await settle();
    expect(screen.getByText(/Put your site online with a free host/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Cloudflare Pages\s*Connect…/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Netlify\s*Connect…/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Or keep it on this computer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export site folder" }).className).not.toContain("st-button-primary");
    expect(screen.queryByText(/comes in a later update/)).toBeNull();
  });

  it("once connected, an unset site address uses the host's", async () => {
    const publisher = { preview: vi.fn(), exportSite: vi.fn(), replaceExport: vi.fn(), showExport: vi.fn(), buildToPublish: vi.fn() } as unknown as LocalPublisher;
    render(<DesktopPublishPanel publisher={publisher} siteUrl="https://example.pages.dev" hosts={fakeHosts({ connection: connection(), suggestedName: "x" })} />);
    await settle();
    expect(screen.getByText(/sitemap use harbour-studio\.pages\.dev, where it's published/)).toBeTruthy();
  });

  it("connect: token, then address; the token page opens in the browser", async () => {
    const hosts = fakeHosts(notConnected);
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click(/Cloudflare Pages/);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Connect Cloudflare Pages" })).toBeTruthy();
    expect(within(dialog).getByText(/Account, Cloudflare Pages, Edit/)).toBeTruthy();
    expect(within(dialog).getByText("1 · Token").getAttribute("aria-current")).toBe("step");
    await click(/Open Cloudflare token page/, dialog);
    expect(hosts.openTokenPage).toHaveBeenCalledWith("cloudflare");

    const field = screen.getByLabelText("Paste the token") as HTMLInputElement;
    expect(field.type).toBe("password");
    expect(field.getAttribute("aria-describedby")).toContain("lock");
    expect(screen.getByText("Kept in this computer's keychain, not in the site folder.")).toBeTruthy();

    await type("Paste the token", "secret-token");
    await submit("Check token");
    expect(hosts.checkToken).toHaveBeenCalledWith("cloudflare", "secret-token");
    expect(screen.getByRole("heading", { name: "Where should this site live?" })).toBeTruthy();
    expect((screen.getByLabelText("Address") as HTMLInputElement).value).toBe("harbour-studio");
    expect(screen.getByText(".pages.dev")).toBeTruthy();

    await type("Address", "Harbour Two");
    expect((screen.getByLabelText("Address") as HTMLInputElement).value).toBe("harbour-two");
    await submit("Connect");
    expect(hosts.connect).toHaveBeenCalledWith("cloudflare", "secret-token", { id: "acc1", name: "Hosni" }, "harbour-two");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("harbour-two.pages.dev")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
    expect(screen.getByText(/Not published here yet/)).toBeTruthy();
  });

  it("a wrong token is said under the field, which gets focus", async () => {
    const hosts = fakeHosts(notConnected, {
      checkToken: vi.fn(async () => {
        throw { kind: "token", message: "Netlify didn't accept this token. Check you copied all of it." };
      }),
    });
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click(/Netlify/);
    await submit("Check token");
    expect(screen.getByRole("alert").textContent).toBe("Paste the token first.");
    expect(hosts.checkToken).not.toHaveBeenCalled();
    await type("Paste the token", "nope");
    await submit("Check token");
    const field = screen.getByLabelText("Paste the token");
    expect(screen.getByRole("alert").textContent).toBe("Netlify didn't accept this token. Check you copied all of it.");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")).toContain("error");
    expect(document.activeElement).toBe(field);
  });

  it("asks which account when the token reaches several", async () => {
    const hosts = fakeHosts(notConnected, {
      checkToken: vi.fn(async () => [
        { id: "a1", name: "Studio" },
        { id: "a2", name: "Personal" },
      ]),
    });
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click(/Cloudflare Pages/);
    await type("Paste the token", "t");
    await submit("Check token");
    expect(screen.getByRole("group", { name: "Which Cloudflare account?" })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Personal"));
    });
    await submit("Connect");
    expect(hosts.connect).toHaveBeenCalledWith("cloudflare", "t", { id: "a2", name: "Personal" }, "harbour-studio");
  });

  it("a taken address offers a free one", async () => {
    const connect = vi.fn(async () => {
      throw { kind: "taken", message: "“harbour-studio” is taken on Netlify. Try “harbour-studio-2”.", suggestion: "harbour-studio-2" };
    });
    const hosts = fakeHosts(notConnected, { connect: connect as never });
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click(/Netlify/);
    await type("Paste the token", "t");
    await submit("Check token");
    expect(screen.getByText(".netlify.app")).toBeTruthy();
    await submit("Connect");
    expect(screen.getByText(/is taken on Netlify/)).toBeTruthy();
    await click("Use “harbour-studio-2”");
    expect((screen.getByLabelText("Address") as HTMLInputElement).value).toBe("harbour-studio-2");
  });

  it("checks the address before asking the host", async () => {
    const hosts = fakeHosts({ connection: null, suggestedName: "" });
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click(/Cloudflare Pages/);
    await type("Paste the token", "t");
    await submit("Check token");
    await submit("Connect");
    expect(screen.getByText("Type an address.")).toBeTruthy();
    expect(hosts.connect).not.toHaveBeenCalled();
    await click("Back");
    expect(screen.getByRole("heading", { name: "Connect Cloudflare Pages" })).toBeTruthy();
  });
});

/** A minute ago, but never before midnight, so "today" holds when tests run just after 00:00. */
const aMinuteAgoToday = () => Math.max(Date.now() - 60_000, new Date().setHours(0, 0, 0, 0));

describe("hosts: publishing", () => {
  it("publishes and says the site is live, with a way to open it", async () => {
    const hosts = fakeHosts({ connection: connection({ lastPublished: aMinuteAgoToday() }), suggestedName: "x" });
    render(<HostPublish hosts={hosts} />);
    await settle();
    expect(screen.getByText(/Cloudflare Pages/)).toBeTruthy();
    expect(screen.getByText(/Last published today/)).toBeTruthy();
    await click("Publish");
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Your site is live. 8 pages, 10 photos, search on 9 pages.");
    expect(status.textContent).toContain("https://harbour-studio.pages.dev");
    await click(/Open the site/);
    expect(hosts.openSite).toHaveBeenCalledTimes(1);
  });

  it("shows upload progress while it works", async () => {
    let finish: () => void = () => {};
    const hosts = fakeHosts(
      { connection: connection(), suggestedName: "x" },
      {
        publish: vi.fn(
          (onProgress: (p: { done: number; total: number }) => void) =>
            new Promise<Awaited<ReturnType<HostsApi["publish"]>>>((resolve) => {
              onProgress({ done: 14, total: 38 });
              finish = () => resolve({ published: { url: "u", uploaded: 38, files: 40 }, report: report() });
            }),
        ),
      },
    );
    const onBusy = vi.fn();
    render(<HostPublish hosts={hosts} onBusy={onBusy} />);
    await settle();
    await click("Publish");
    expect(screen.getByRole("status").textContent).toContain("Uploading 14 of 38 files…");
    const bar = screen.getByRole("progressbar", { name: "Upload progress" }) as HTMLProgressElement;
    expect([bar.max, bar.value]).toEqual([38, 14]);
    expect(screen.getByRole("button", { name: "Publish" }).getAttribute("aria-disabled")).toBe("true");
    expect(onBusy).toHaveBeenLastCalledWith(true);
    await act(async () => finish());
    expect(onBusy).toHaveBeenLastCalledWith(false);
  });

  it("an expired token: says so and takes a new one", async () => {
    const hosts = fakeHosts(
      { connection: connection(), suggestedName: "x" },
      {
        publish: vi.fn(async () => {
          throw { kind: "token", message: "Cloudflare no longer accepts the saved token. It may have expired or been deleted on Cloudflare." };
        }),
      },
    );
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click("Publish");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Nothing was published. Cloudflare no longer accepts the saved token.");
    await click("Paste a new token", alert);
    expect(screen.getByRole("heading", { name: "Paste a new Cloudflare token" })).toBeTruthy();
    expect(screen.queryByText("1 · Token")).toBeNull();
    await type("Paste the token", "fresh");
    await submit("Check and save");
    expect(hosts.replaceToken).toHaveBeenCalledWith("fresh");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("page problems are listed, as with Export", async () => {
    const hosts = fakeHosts(
      { connection: connection(), suggestedName: "x" },
      {
        publish: vi.fn(async () => {
          throw new HostFailure("problems", "Nothing was published. Fix this problem on 1 page and publish again:\n  - Page /about/: An image has no description.");
        }),
      },
    );
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click("Publish");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Nothing was published. Fix this problem on 1 page and publish again:");
    expect(within(alert).getByRole("listitem").textContent).toBe("Page /about/: An image has no description.");
  });

  it("no internet: says nothing on the live site changed", async () => {
    const hosts = fakeHosts(
      { connection: connection(), suggestedName: "x" },
      {
        publish: vi.fn(async () => {
          throw { kind: "offline", message: "Couldn't reach Cloudflare. Check the internet connection and try again. (io: refused)" };
        }),
      },
    );
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click("Publish");
    expect(screen.getByRole("alert").textContent).toBe("Couldn't reach Cloudflare. Check the internet connection and try again. Nothing on the live site changed.");
  });

  it("a project deleted on the host offers to connect again", async () => {
    const hosts = fakeHosts(
      { connection: connection(), suggestedName: "x" },
      {
        publish: vi.fn(async () => {
          throw { kind: "gone", message: "Cloudflare no longer has “harbour-studio”." };
        }),
      },
    );
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click("Publish");
    await click("Connect again");
    expect(screen.getByRole("heading", { name: "Connect Cloudflare Pages" })).toBeTruthy();
  });

  it("a token missing from the keychain is asked for before publishing", async () => {
    render(<HostPublish hosts={fakeHosts({ connection: connection({ hasToken: false }), suggestedName: "x" })} />);
    await settle();
    expect(screen.getByText(/keychain no longer has the Cloudflare token/)).toBeTruthy();
    await click("Paste a new token");
    expect(screen.getByRole("heading", { name: "Paste a new Cloudflare token" })).toBeTruthy();
  });

  it("change or disconnect", async () => {
    const hosts = fakeHosts({ connection: connection(), suggestedName: "x" });
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click("Change or disconnect");
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("the live site stays online until you remove it on Cloudflare");
    expect(within(dialog).getByRole("button", { name: "Move to Netlify" })).toBeTruthy();
    await click("Disconnect", dialog);
    expect(hosts.disconnect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Cloudflare Pages\s*Connect…/ })).toBeTruthy();
  });

  it("move to the other host opens its connect dialog", async () => {
    render(<HostPublish hosts={fakeHosts({ connection: connection(), suggestedName: "x" })} />);
    await settle();
    await click("Change or disconnect");
    await click("Move to Netlify");
    expect(screen.getByRole("heading", { name: "Connect Netlify" })).toBeTruthy();
  });
});

// ------------------------------------------------------------------ F059

const ftpConnection = (over: Partial<HostConnection> = {}): HostConnection =>
  connection({
    host: "ftp",
    accountName: "rina@ftp.example.com",
    project: "ftp.example.com",
    url: "https://rina.example.com",
    ftp: { protocol: "sftp", server: "ftp.example.com", port: 22, username: "rina", folder: "public_html", hostKey: "SHA256:abc" },
    ...over,
  });

const fillFtp = async (over: Record<string, string> = {}) => {
  const values = { Server: "ftp.example.com", Username: "rina", Password: "secret", "Folder on the server": "public_html", "Site address": "https://rina.example.com", ...over };
  for (const [label, value] of Object.entries(values)) await type(new RegExp(`^${label}`), value);
};

describe("hosts: FTP and SFTP words", () => {
  it("checks the server form field by field", () => {
    const ok = { protocol: "sftp" as const, server: "ftp.example.com", port: 22, username: "rina", folder: "public_html" };
    expect(ftpProblems(ok, "pw", "https://example.com")).toEqual({});
    expect(ftpProblems(ok, "pw", "example.com")).toEqual({});
    expect(Object.keys(ftpProblems({ ...ok, server: "", username: " ", port: 0 }, "", ""))).toEqual(["server", "port", "username", "password", "url"]);
    expect(ftpProblems({ ...ok, server: "ftp.example.com/public_html" }, "pw", "https://example.com").server).toMatch(/without a folder/);
    expect(ftpProblems({ ...ok, folder: "../etc" }, "pw", "https://example.com").folder).toMatch(/“\.\.”/);
    expect(ftpProblems(ok, "pw", "https://example.com/blog").url).toMatch(/nothing after the domain/);
    expect(ftpProblems(ok, "", "https://example.com", false)).toEqual({});
  });

  it("names the connection by how files are sent", () => {
    expect(productName(ftpConnection())).toBe("SFTP");
    expect(productName(connection())).toBe("Cloudflare Pages");
  });

  it("calls the app's FTP commands", async () => {
    const invoke = vi.fn(async () => null);
    const api = hostsApi(invoke, vi.fn(), vi.fn());
    const settings = { protocol: "ftps" as const, server: "s", port: 21, username: "u", folder: "" };
    await api.connectFtp(settings, "pw", "https://example.com");
    await api.resendAll();
    expect(invoke).toHaveBeenCalledWith("host_connect_ftp", { settings, password: "pw", url: "https://example.com" });
    expect(invoke).toHaveBeenCalledWith("host_resend_all", undefined);
  });
});

describe("hosts: connecting your own web host", () => {
  it("offers it next to the two hosts and connects with every detail on one form", async () => {
    const hosts = fakeHosts(notConnected);
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click(/Your own web host\s*FTP or SFTP/);
    expect(screen.getByRole("heading", { name: "Connect your own web host" })).toBeTruthy();
    const sftp = screen.getByRole("radio", { name: /SFTP \(recommended\)/ }) as HTMLInputElement;
    expect(sftp.checked).toBe(true);
    expect(document.activeElement).toBe(sftp);
    expect((screen.getByLabelText("Port") as HTMLInputElement).value).toBe("22");
    await fillFtp();
    await submit("Check and connect");
    expect(hosts.connectFtp).toHaveBeenCalledWith(
      { protocol: "sftp", server: "ftp.example.com", port: 22, username: "rina", folder: "public_html", hostKey: undefined },
      "secret",
      "https://rina.example.com",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("SFTP")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Publish" }));
  });

  it("FTPS and FTP use port 21 unless the port was typed", async () => {
    render(<HostPublish hosts={fakeHosts(notConnected)} />);
    await settle();
    await click(/Your own web host/);
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: /FTPS/ })));
    expect((screen.getByLabelText("Port") as HTMLInputElement).value).toBe("21");
    await type("Port", "2222");
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: /SFTP/ })));
    expect((screen.getByLabelText("Port") as HTMLInputElement).value).toBe("2222");
  });

  it("plain FTP warns that the password travels unencrypted, in the dialog and on the card", async () => {
    const hosts = fakeHosts(notConnected);
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click(/Your own web host/);
    expect(screen.queryByText(/Not encrypted\./)).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: /FTP \(not encrypted\)/ })));
    expect(screen.getByText(/Not encrypted\./).closest(".dp-box")!.textContent).toMatch(/sends your password and files unencrypted/);
    await fillFtp();
    await submit("Check and connect");
    expect(screen.getByText(/Plain FTP: your password and files travel unencrypted/)).toBeTruthy();
  });

  it("missing details are said under their fields, and the first one gets focus", async () => {
    const hosts = fakeHosts(notConnected);
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click(/Your own web host/);
    await submit("Check and connect");
    expect(hosts.connectFtp).not.toHaveBeenCalled();
    const server = screen.getByLabelText("Server");
    expect(document.activeElement).toBe(server);
    expect(server.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(server.getAttribute("aria-describedby")!)!.textContent).toMatch(/server's name/);
    expect(screen.getByText("Type the password.")).toBeTruthy();
  });

  it("the app's refusals land under the field they're about", async () => {
    const cases: [string, string][] = [
      ["token", "Password"],
      ["offline", "Server"],
      ["folder", "Folder on the server"],
    ];
    for (const [kind, label] of cases) {
      const hosts = fakeHosts(notConnected, { connectFtp: vi.fn(async () => Promise.reject({ kind, message: `bad ${kind}` })) });
      render(<HostPublish hosts={hosts} />);
      await settle();
      await click(/Your own web host/);
      await fillFtp();
      await submit("Check and connect");
      const field = screen.getByLabelText(new RegExp(`^${label}`));
      expect(document.activeElement).toBe(field);
      expect(field.getAttribute("aria-describedby")).toContain("error");
      expect(screen.getByText(`bad ${kind}`)).toBeTruthy();
      cleanup();
    }
  });

  it("a refused saved password asks for it again, not for a token", async () => {
    const hosts = fakeHosts(
      { connection: ftpConnection(), suggestedName: "x" },
      {
        publish: vi.fn(async () => Promise.reject({ kind: "token", message: "The server no longer accepts the saved password." })),
        replaceToken: vi.fn(async () => ftpConnection()),
      },
    );
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click("Publish");
    await click("Type the password again");
    expect(screen.getByRole("heading", { name: "Type the password again" })).toBeTruthy();
    await type(/^Password/, "new-secret");
    await submit("Check and save");
    expect(hosts.replaceToken).toHaveBeenCalledWith("new-secret");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a changed server key stops publishing and offers to check the details", async () => {
    const hosts = fakeHosts(
      { connection: ftpConnection(), suggestedName: "x" },
      { publish: vi.fn(async () => Promise.reject({ kind: "identity", message: "The server's key has changed." })) },
    );
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click("Publish");
    expect(screen.getByRole("alert").textContent).toMatch(/key has changed/);
    await click("Check the server details");
    expect(screen.getByRole("heading", { name: "Change the server details" })).toBeTruthy();
    expect((screen.getByLabelText("Server") as HTMLInputElement).value).toBe("ftp.example.com");
    expect((screen.getByLabelText(/^Site address/) as HTMLInputElement).value).toBe("https://rina.example.com");
  });

  it("change dialog: server key, send every file next time, move to a host", async () => {
    const hosts = fakeHosts({ connection: ftpConnection(), suggestedName: "x" });
    render(<HostPublish hosts={hosts} />);
    await settle();
    await click("Change or disconnect");
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("rina@ftp.example.com");
    expect(dialog.textContent).toContain("until you remove it from the server");
    expect(dialog.textContent).toContain("SHA256:abc");
    expect(within(dialog).getByRole("button", { name: "Move to Cloudflare Pages" })).toBeTruthy();
    await click("Send every file next time", dialog);
    expect(hosts.resendAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a connected Cloudflare site can move to its own web host", async () => {
    render(<HostPublish hosts={fakeHosts({ connection: connection(), suggestedName: "x" })} />);
    await settle();
    await click("Change or disconnect");
    await click("Move to your own web host (FTP or SFTP)");
    expect(screen.getByRole("heading", { name: "Connect your own web host" })).toBeTruthy();
  });
});
