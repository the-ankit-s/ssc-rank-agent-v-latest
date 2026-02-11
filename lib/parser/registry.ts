import type { VendorID } from "./types";
import { TCS_PROFILE } from "./tcs";
import type { VendorProfile } from "./types";

export const VENDORS: Record<VendorID, VendorProfile> = {
    TCS: TCS_PROFILE,

    // Future NTA implementation would go here
    NTA_FUTURE: {
        id: "NTA_FUTURE",
        findCorrectOption: () => -1,
        findChosenOption: () => 0,
        questionBlockSelector: ".nta-card",
        metadataSelector: (l) => `.meta-${l}`,
    },
};
