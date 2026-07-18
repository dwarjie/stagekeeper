/** A staging branch the user chose to track, keyed by `branchId` in storage. */
export type TrackedBranch = {
	branchId: number; // unique key
	projectName: string; // "sample-project"
	repoName: string; // "sample_project_odoo"
	branchName: string; // "staging"
	expirationDate: string; // "YYYY-MM-DD" (live build's date)
	branchUrl: string; // odoo.sh URL to the branch
	trackedAt: string; // ISO timestamp of first track
	updatedAt: string; // ISO timestamp of last upsert
};

export type Settings = {
	warningDays: number; // notify/highlight when expiry is within N days
};

/** Clean branch identity resolved from `window.odoo` by the MAIN-world reader. */
export type OdooBranchInfo = {
	branchId: number;
	projectName: string;
	repoName: string;
	branchName: string;
	stage: string;
};

// ---------------------------------------------------------------------------
// postMessage bridge (MAIN world ↔ isolated content script)
//
// Every message carries a namespaced `type` (prefix "stagekeeper:") so we never
// collide with the page's own postMessage traffic, and request/response pairs
// are correlated by `id`.
// ---------------------------------------------------------------------------

export type BridgeBranchInfoRequest = {
	type: 'stagekeeper:branch-info:request';
	id: string;
	branchName: string;
};

export type BridgeBranchInfoResponse =
	| {
			type: 'stagekeeper:branch-info:response';
			id: string;
			ok: true;
			info: OdooBranchInfo;
	  }
	| {
			type: 'stagekeeper:branch-info:response';
			id: string;
			ok: false;
			error: string;
	  };

/** Emitted by the MAIN-world reader on SPA route changes (patched history API). */
export type BridgeNavigationEvent = {
	type: 'stagekeeper:navigation';
	href: string;
};

export type BridgeMessage =
	| BridgeBranchInfoRequest
	| BridgeBranchInfoResponse
	| BridgeNavigationEvent;
