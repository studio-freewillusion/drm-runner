import CryptoJS from "crypto-js";

export default class MyDrmHelper {
    constructor() {
        this.siteId = process.env.DRM_SITE_ID;
        this.accessKey = process.env.DRM_ACCESS_KEY;
        this.secretKey = process.env.DRM_SECRET_KEY;
        this.betaMode = false;
        this.isGov = false;
    }

    setApiKey(accessKey, secretKey) {
        this.accessKey = accessKey;
        this.secretKey = secretKey;
    }

    setSiteId(siteId) {
        this.siteId = siteId;
    }

    createToken(drmType, cid) {
        return btoa(JSON.stringify({
            siteId: this.siteId,
            contentId: cid,
            drmType,
            responseFormat: "original"
        }));
    }

    makeSignature(uri, timestamp, method = "GET") {
        const space = " ";
        const newLine = "\n";
        const url = uri;
        timestamp = `${timestamp}`;

        const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, this.secretKey);
        hmac.update(method);
        hmac.update(space);
        hmac.update(url);
        hmac.update(newLine);
        hmac.update(timestamp);
        hmac.update(newLine);
        hmac.update(this.accessKey);

        const hash = hmac.finalize();
        return hash.toString(CryptoJS.enc.Base64);
    }

    getApiGwHeader(drmType, contentId, uri, accept = "", method = "POST") {
        const timestamp = moment().valueOf();
        return {
            "x-ncp-region_code": "KR",
            "x-ncp-iam-access-key": this.accessKey,
            "x-ncp-apigw-timestamp": timestamp,
            "x-ncp-apigw-signature-v2": this.makeSignature(uri, timestamp, method),
            "x-drm-token": this.createToken(drmType, contentId),
            ...(accept && { accept }),
        };
    }

    /**
     * ✅ ✅ ✅ 핵심 로직
     * drmType에 따라 어떤 DRM만 리턴할지 제어
     */
    drmSourceHelper(source, contentId, drmType) {
        const drm = {};

        try {
            if (drmType === "WIDEVINE" && source.hls) {
                drm["com.widevine.alpha"] = {
                    src: source.hls,
                    licenseUri: "https://multi-drm.apigw.ntruss.com/api/v1/license",
                    licenseRequestHeader: this.getApiGwHeader("WIDEVINE", contentId, "/api/v1/license")
                };
            }

            if (drmType === "PLAYREADY" && source.hls) {
                drm["com.microsoft.playready"] = {
                    src: source.hls,
                    licenseUri: "https://multi-drm.apigw.ntruss.com/api/v1/license",
                    licenseRequestHeader: this.getApiGwHeader("PLAYREADY", contentId, "/api/v1/license")
                };
            }

            if (drmType === "FAIRPLAY" && source.hls) {
                drm["com.apple.fps"] = {
                    src: source.hls,
                    certificateUri: "https://multi-drm.apigw.ntruss.com/api/v1/license/fairPlay",
                    certificateRequestHeader: this.getApiGwHeader("FAIRPLAY", contentId, "/api/v1/license/fairPlay", "application/json", "GET"),
                    licenseUri: "https://multi-drm.apigw.ntruss.com/api/v1/license",
                    licenseRequestHeader: this.getApiGwHeader("FAIRPLAY", contentId, "/api/v1/license")
                };
            }

            if (!drmType || drmType === "ALL") {
                // 모든 DRM 리턴
                drm["com.widevine.alpha"] = {
                    src: source.hls,
                    licenseUri: "https://multi-drm.apigw.ntruss.com/api/v1/license",
                    licenseRequestHeader: this.getApiGwHeader("WIDEVINE", contentId, "/api/v1/license")
                };
                drm["com.microsoft.playready"] = {
                    src: source.hls,
                    licenseUri: "https://multi-drm.apigw.ntruss.com/api/v1/license",
                    licenseRequestHeader: this.getApiGwHeader("PLAYREADY", contentId, "/api/v1/license")
                };
                drm["com.apple.fps"] = {
                    src: source.hls,
                    certificateUri: "https://multi-drm.apigw.ntruss.com/api/v1/license/fairPlay",
                    certificateRequestHeader: this.getApiGwHeader("FAIRPLAY", contentId, "/api/v1/license/fairPlay", "application/json", "GET"),
                    licenseUri: "https://multi-drm.apigw.ntruss.com/api/v1/license",
                    licenseRequestHeader: this.getApiGwHeader("FAIRPLAY", contentId, "/api/v1/license")
                };
            }

        } catch (e) {
            console.error("NCP DRM Error:", e);
        }

        return drm;
    }
}
