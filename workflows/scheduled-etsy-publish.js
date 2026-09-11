import { sleep } from "workflow";
import { publishDraftListing } from "../lib/etsy";

async function publishListingStep(payload) {
  "use step";
  return publishDraftListing(payload);
}

export async function scheduledEtsyPublishWorkflow(payload) {
  "use workflow";

  const publishAt = new Date(payload.publishAt);
  await sleep(publishAt);

  return publishListingStep({
    listingId: payload.listingId,
    refreshToken: payload.refreshToken,
  });
}
