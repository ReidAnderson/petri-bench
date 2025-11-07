import { describe, expect, it } from 'vitest';
import { PriorityQueue, byKey, byKeyDesc, maxHeap, minHeap } from '../src/utils/priorityQueue';

describe('PriorityQueue', () => {
    it('min-heap with numbers', () => {
        const pq = minHeap([5, 1, 3]);
        pq.push(2);
        expect(pq.peek()).toBe(1);
        expect([pq.pop(), pq.pop(), pq.pop(), pq.pop()]).toEqual([1, 2, 3, 5]);
        expect(pq.pop()).toBeUndefined();
    });

    it('max-heap with numbers', () => {
        const pq = maxHeap();
        [4, 7, 1, 9, 2].forEach(n => pq.push(n));
        expect(pq.peek()).toBe(9);
        expect([pq.pop(), pq.pop(), pq.pop()]).toEqual([9, 7, 4]);
    });

    it('object heap by key asc/desc', () => {
        type Item = { id: string; score: number };
        const items: Item[] = [
            { id: 'a', score: 10 },
            { id: 'b', score: 5 },
            { id: 'c', score: 7 },
        ];

        const minByScore = new PriorityQueue<Item>(byKey<Item>(i => i.score), items);
        expect(minByScore.pop()!.id).toBe('b');
        expect(minByScore.pop()!.id).toBe('c');
        expect(minByScore.pop()!.id).toBe('a');
        expect(minByScore.pop()).toBeUndefined();

        const maxByScore = new PriorityQueue<Item>(byKeyDesc<Item>(i => i.score), items);
        expect(maxByScore.pop()!.id).toBe('a');
        expect(maxByScore.pop()!.id).toBe('c');
        expect(maxByScore.pop()!.id).toBe('b');
    });

    it('replace top element', () => {
        const pq = minHeap([3, 4]);
        expect(pq.peek()).toBe(3);
        pq.replace(10);
        expect(pq.peek()).toBe(4);
    });

    it('clear and toArray do not mutate', () => {
        const pq = minHeap([3, 1, 2]);
        const a = pq.toArray();
        expect(a.sort((x, y) => x - y)).toEqual([1, 2, 3]);
        pq.clear();
        expect(pq.size()).toBe(0);
    });
});
