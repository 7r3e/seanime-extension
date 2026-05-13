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

        async function openUrl(url: string) {
            const body = await ctx.dom.queryOne("body")
            if (!body) return
            const script = await ctx.dom.createElement("script")
            script.setInnerHTML(`window.open(${JSON.stringify(url)}, "_blank")`)
            body.append(script)
        }

        // ── Episode grid context menu for all grid types ──────────────────────
        const gridTypes: Array<"library" | "torrentstream" | "debridstream" | "onlinestream" | "undownloaded" | "medialinks" | "mediastream"> =
            ["library", "torrentstream", "debridstream", "onlinestream", "undownloaded", "medialinks", "mediastream"]

        for (const gridType of gridTypes) {
            const item = ctx.action.newEpisodeGridItemMenuItem({
                label: "r/anime Discussion",
                type: gridType,
            })
            item.mount()
            item.onClick((event) => {
                const episode = event.episode as $app.Anime_Episode
                const media = episode.baseAnime
                if (!media) return
                const title =
                    media.title?.romaji ||
                    media.title?.english ||
                    media.title?.native ||
                    ""
                openUrl(buildRedditUrl(title, episode.episodeNumber))
            })
        }

        // ── DOM injection on anime entry page ─────────────────────────────────
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
                "display:inline-flex;align-items:center;gap:0.4rem;" +
                "padding:0.3rem 0.65rem 0.3rem 0.45rem;background:transparent;color:#fff;" +
                "border-radius:9999px;font-size:0.82rem;font-weight:600;" +
                "text-decoration:none;white-space:nowrap;cursor:pointer;" +
                "vertical-align:middle;"
            )

            // Reddit alien SVG (black/white)
            const icon = await ctx.dom.createElement("span")
            icon.setStyle("display", "inline-flex")
            icon.setStyle("align-items", "center")
            icon.setStyle("flex-shrink", "0")
            icon.setInnerHTML(
                `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20">` +
                `<circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/>` +
                `<path fill="#fff" d="M16.7 9.9a1.4 1.4 0 0 0-2.4-.9 6.8 6.8 0 0 0-3.6-1.1l.6-2.9 2 .4a1 1 0 1 0 .1-.5l-2.2-.5a.2.2 0 0 0-.3.2l-.7 3.3a6.8 6.8 0 0 0-3.6 1.1 1.4 1.4 0 1 0-1.5 2.2 2.7 2.7 0 0 0 0 .4c0 2 2.3 3.6 5.2 3.6s5.2-1.6 5.2-3.6a2.7 2.7 0 0 0 0-.4 1.4 1.4 0 0 0 .8-1.3zM7.3 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.5 2.6a3.4 3.4 0 0 1-2.7.9 3.4 3.4 0 0 1-2.7-.9.2.2 0 0 1 .3-.3 3 3 0 0 0 2.4.7 3 3 0 0 0 2.4-.7.2.2 0 0 1 .3.3zm-.2-1.6a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/>` +
                `</svg>`
            )

            // Episode number label
            const epLabel = await ctx.dom.createElement("span")
            epLabel.setText(`Ep ${episodeNumber}`)

            btn.append(icon)
            btn.append(epLabel)
            btnAL.after(btn)
        })
    })
}