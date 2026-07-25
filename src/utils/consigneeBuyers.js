/** Returns buyer id list linked to a consignee (supports multi + legacy single). */
export function getConsigneeBuyerIds(consignee) {
  if (!consignee) return [];
  if (Array.isArray(consignee.buyer_ids) && consignee.buyer_ids.length) {
    return consignee.buyer_ids.map(String);
  }
  if (consignee.buyer_id != null && consignee.buyer_id !== "") {
    return [String(consignee.buyer_id)];
  }
  return [];
}

/** True if consignee is linked to the given buyer. */
export function consigneeHasBuyer(consignee, buyerId) {
  const id = String(buyerId || "");
  if (!id) return false;
  return getConsigneeBuyerIds(consignee).includes(id);
}
