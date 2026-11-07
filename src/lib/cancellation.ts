/**
 * The cancellation promise, in one place rather than two.
 *
 * Two screens quote the same rule — the booking wizard before the customer
 * pays, and the booking sheet afterwards — and each filled the sentence its
 * own way. One of them only knew `{hours}`, a placeholder this sentence does
 * not carry, so it printed its own `{free}`, `{fee}` and `{notice}` at the
 * customer. Writing the substitution twice is what let the two drift apart,
 * so they now share it.
 *
 * All three figures come from settings. They are policy, they differ between
 * servers, and the sentence a customer reads has to be the rule the server
 * will actually enforce.
 */
export type CancellationTerms = {
  /** How long cancelling stays free, in hours. */
  freeHours: number;
  /** What it costs after that. Zero means there is no fee at all. */
  fee: number;
  /** The window inside which it can no longer be cancelled, in hours. */
  noticeHours: number;
  /** The fee written as money, by whichever formatter the screen already has. */
  money: (value: number) => string;
};

/**
 * @param withFee     the full sentence, carrying {free}, {fee} and {notice}
 * @param withoutFee  the same rule with no fee in it, carrying {free} and {notice}
 *
 * A fee of zero is not a fee of nothing — it is no fee. Quoting one anyway
 * gave "later than that a AED 0.00 fee applies", which reads as a charge the
 * customer cannot work out and contradicts the policy it is describing. An
 * office that sets the fee to zero has decided cancelling is free up to the
 * notice window, and the sentence says that instead.
 *
 * The no-fee wording is optional: a dictionary that has not been given one
 * falls back to the sentence with the figure in it, which is wrong in the
 * same old way but is never blank.
 */
export function cancellationSentence(
  withFee: string | undefined,
  withoutFee: string | undefined,
  terms: CancellationTerms
): string {
  const template = terms.fee > 0 ? withFee : (withoutFee ?? withFee);

  return (template ?? "")
    .replace("{free}", String(terms.freeHours))
    .replace("{fee}", terms.money(terms.fee))
    .replace("{notice}", String(terms.noticeHours));
}
