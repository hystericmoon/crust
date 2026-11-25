/** F100: Media from the site menu: all the site's photos on a screen of their own (the same panel the editor has). */
import { AppTopBar } from "../app-frame/AppTopBar";
import { MediaPanel } from "../app-frame/rail";

export function MediaScreen() {
  return (
    <div className="st">
      <AppTopBar where={<h1 className="af-title">Media</h1>} />
      <main className="pg" style={{ maxWidth: 720 }}>
        <MediaPanel />
      </main>
    </div>
  );
}
