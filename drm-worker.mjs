import vpeDrmHelper from 'vpe-drm-helper';

const args = process.argv.slice(2);
const hlsUrl = decodeURIComponent(args[0]);
const dashUrl = decodeURIComponent(args[1]);
const contentId = args[2];
const drmType = args[3]; // "FAIRPLAY", "WIDEVINE", "PLAYREADY"

if (!hlsUrl && !dashUrl) {
    console.error('Usage: drm-worker.mjs <hlsUrl> <dashUrl> <contentId> <drmType>');
    process.exit(1);
}
if (!contentId || !drmType) {
    console.error('Usage: drm-worker.mjs <hlsUrl> <dashUrl> <contentId> <drmType>');
    process.exit(1);
}

// DRM Helper 인스턴스 생성
const NDRM = new vpeDrmHelper();
NDRM.isGov = false;
NDRM.setSiteId(process.env.DRM_SITE_ID);
NDRM.setApiKey(process.env.DRM_ACCESS_KEY, process.env.DRM_SECRET_KEY);

(async () => {
    try {
        const result = await NDRM.drmSourceHelper(
            {
                hls: hlsUrl || undefined,
                dash: dashUrl || undefined,
            },
            contentId
        );

        console.log(JSON.stringify(result));
    } catch (err) {
        console.error('DRM worker error:', err);
        process.exit(1);
    }
})();