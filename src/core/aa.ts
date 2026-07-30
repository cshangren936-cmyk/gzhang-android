import type {
  AaParticipant,
  AaShare,
  AaTransfer,
} from "../types";
import { roundMoney } from "./money";

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(value: number): number {
  return roundMoney(value / 100);
}

function allocateCents(total: number, bases: number[]): number[] {
  const totalCents = toCents(total);
  const baseCents = bases.map(toCents);
  const baseTotal = baseCents.reduce((sum, value) => sum + value, 0);
  if (totalCents <= 0 || baseTotal <= 0) return bases.map(() => 0);

  const raw = baseCents.map((base) => (totalCents * base) / baseTotal);
  const allocated = raw.map(Math.floor);
  let remainder =
    totalCents - allocated.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < order.length && remainder > 0; index += 1) {
    allocated[order[index].index] += 1;
    remainder -= 1;
  }
  return allocated;
}

function greedyTransfers(
  ids: string[],
  balances: number[],
): AaTransfer[] {
  const debtors = balances
    .map((balance, index) => ({ index, amount: Math.max(0, -balance) }))
    .filter((item) => item.amount > 0);
  const creditors = balances
    .map((balance, index) => ({ index, amount: Math.max(0, balance) }))
    .filter((item) => item.amount > 0);
  const transfers: AaTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    transfers.push({
      fromParticipantId: ids[debtor.index],
      toParticipantId: ids[creditor.index],
      amount: fromCents(amount),
    });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (!debtor.amount) debtorIndex += 1;
    if (!creditor.amount) creditorIndex += 1;
  }
  return transfers;
}

export function minimumTransfers(
  participantIds: string[],
  balancesInCents: number[],
): AaTransfer[] {
  if (participantIds.length > 10) {
    return greedyTransfers(participantIds, balancesInCents);
  }

  const memo = new Map<string, AaTransfer[] | null>();
  const solve = (balances: number[]): AaTransfer[] | null => {
    const key = balances.join(",");
    if (memo.has(key)) return memo.get(key)!;
    const debtorIndex = balances.findIndex((balance) => balance < 0);
    if (debtorIndex === -1) return [];

    let best: AaTransfer[] | null = null;
    const seenCreditorBalances = new Set<number>();
    for (let creditorIndex = 0; creditorIndex < balances.length; creditorIndex += 1) {
      if (balances[creditorIndex] <= 0) continue;
      if (seenCreditorBalances.has(balances[creditorIndex])) continue;
      seenCreditorBalances.add(balances[creditorIndex]);
      const amount = Math.min(
        -balances[debtorIndex],
        balances[creditorIndex],
      );
      const next = [...balances];
      next[debtorIndex] += amount;
      next[creditorIndex] -= amount;
      const tail = solve(next);
      if (!tail) continue;
      const candidate: AaTransfer[] = [
        {
          fromParticipantId: participantIds[debtorIndex],
          toParticipantId: participantIds[creditorIndex],
          amount: fromCents(amount),
        },
        ...tail,
      ];
      if (!best || candidate.length < best.length) best = candidate;
    }
    memo.set(key, best);
    return best;
  };

  return solve([...balancesInCents]) ?? [];
}

export function calculateAaSettlement(
  participants: AaParticipant[],
  taxAmount: number,
  serviceCharge: number,
  discountAmount: number,
): { shares: AaShare[]; transfers: AaTransfer[]; difference: number } {
  const bases = participants.map((participant) =>
    Math.max(0, participant.consumedAmount),
  );
  const taxes = allocateCents(Math.max(0, taxAmount), bases);
  const service = allocateCents(Math.max(0, serviceCharge), bases);
  const discounts = allocateCents(Math.max(0, discountAmount), bases);
  const shares = participants.map((participant, index) => {
    const subtotal = toCents(Math.max(0, participant.consumedAmount));
    const total = Math.max(
      0,
      subtotal + taxes[index] + service[index] - discounts[index],
    );
    const balance = toCents(Math.max(0, participant.paidAmount)) - total;
    return {
      participantId: participant.id,
      subtotal: fromCents(subtotal),
      tax: fromCents(taxes[index]),
      serviceCharge: fromCents(service[index]),
      discount: fromCents(discounts[index]),
      total: fromCents(total),
      balance: fromCents(balance),
    };
  });
  const balances = shares.map((share) => toCents(share.balance));
  const difference = balances.reduce((sum, value) => sum + value, 0);
  return {
    shares,
    transfers:
      difference === 0
        ? minimumTransfers(
            participants.map((participant) => participant.id),
            balances,
          )
        : [],
    difference: fromCents(difference),
  };
}

