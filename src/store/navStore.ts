import { persistentAtom } from "@nanostores/persistent";
import type { OrgDataType, OrgType } from "@/lib/server/org/functions";

export const $orgState = persistentAtom<OrgType[]>("orgState", [], {
	encode: JSON.stringify,
	decode: JSON.parse,
});

export const currentOrgIdState = persistentAtom<string | null>(
	"currentOrgIdState",
	null,
	{
		encode: JSON.stringify,
		decode: JSON.parse,
	},
);

export const loadingState = persistentAtom<boolean>("loadingState", false, {
	encode: JSON.stringify,
	decode: JSON.parse,
});
