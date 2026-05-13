/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

function init() {
    $ui.register((ctx) => {
        const reloadCd = ctx.state<number>(500)

        function isCustomSource(id: number) {
            return id >= 2 ** 31
        }

        function buildRedditUrl(title: string, episode: number): string {
            const q = encodeURIComponent(`${title} episode ${episode}`)
            return `https://www.reddit.com/r/anime/search/?q=${q}&restrict_sr=1`
        }

        ctx.screen.onNavigate(async ({ pathname, searchParams }) => {
            if (pathname !== "/entry") return
            const id = Number(searchParams.id)
            if (!id || isCustomSource(id)) return

            reloadCd.set(500)

            const $CONTAINER = `[data-anime-meta-section-buttons-container]`
            const container = await ctx.dom.queryOne($CONTAINER, {
                withInnerHTML: true,
                identifyChildren: true,
            })

            if (!container) {
                ctx.setTimeout(() => {
                    ctx.screen.loadCurrent()
                    reloadCd.set(reloadCd.get() + 500)
                }, reloadCd.get())
                return console.log(`r/anime-discussion: container not ready, retrying in ${reloadCd.get()}ms`)
            }

            // Remove any previously injected button for this page
            const old = await container.query(`[data-ranime-discussion]`)
            old.forEach(el => el.remove())

            let episodeNumber: number | null = null
            let animeTitle = ""

            try {
                const entry = await ctx.anime.getAnimeEntry(id)
                if (!entry?.media) return

                const media = entry.media
                animeTitle =
                    media.title?.romaji ||
                    media.title?.english ||
                    media.title?.native ||
                    ""

                episodeNumber = entry.listData?.progress ?? null
            } catch (e) {
                return console.log("r/anime-discussion: getAnimeEntry error:", e)
            }

            if (!episodeNumber || !animeTitle) return

            const url = buildRedditUrl(animeTitle, episodeNumber)

            const btnAL = await container.queryOne("a")
            if (!btnAL) return console.log("r/anime-discussion: AniList button not found")

            const btn = await ctx.dom.createElement("a")
            for (const [k, v] of Object.entries({
                href: url,
                target: "_blank",
                rel: "noopener noreferrer",
                "data-ranime-discussion": `${id}-${episodeNumber}`,
            })) btn.setAttribute(k, v)

            btn.setCssText(
                "display:inline-flex;align-items:center;gap:0.35rem;" +
                "padding:0.35rem 0.75rem;background-color:#FF4500;color:#fff;" +
                "border-radius:9999px;font-size:0.85rem;font-weight:600;" +
                "text-decoration:none;white-space:nowrap;cursor:pointer;"
            )

            const label = await ctx.dom.createElement("span")
            label.setText(`r/anime Ep ${episodeNumber}`)
            btn.append(label)
            btnAL.after(btn)
        })
    })
}