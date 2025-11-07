/**
 * Generic binary-heap Priority Queue.
 * - O(log n) push/pop
 * - O(1) peek
 * Pass a comparator(a,b) returning negative if a<b to build a min-heap.
 */
export type Comparator<T> = (a: T, b: T) => number;

export class PriorityQueue<T> {
    private heap: T[];
    private readonly cmp: Comparator<T>;

    constructor(comparator: Comparator<T>, items?: Iterable<T>) {
        this.cmp = comparator;
        this.heap = [];
        if (items) {
            for (const it of items) this.heap.push(it);
            if (this.heap.length > 1) this.heapify();
        }
    }

    size(): number {
        return this.heap.length;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    clear(): void {
        this.heap.length = 0;
    }

    peek(): T | undefined {
        return this.heap[0];
    }

    toArray(): T[] {
        return this.heap.slice();
    }

    push(value: T): void {
        this.heap.push(value);
        this.siftUp(this.heap.length - 1);
    }

    /**
     * Pop the top element. Returns undefined if empty.
     */
    pop(): T | undefined {
        const n = this.heap.length;
        if (n === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop() as T; // n >= 1
        if (n > 1) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return top;
    }

    /**
     * Replace the top element with a new value and re-heapify.
     * If empty, behaves like push.
     */
    replace(value: T): void {
        if (this.heap.length === 0) {
            this.heap.push(value);
            return;
        }
        this.heap[0] = value;
        this.siftDown(0);
    }

    private heapify(): void {
        // Sift-down from last parent to root
        for (let i = (this.heap.length >> 1) - 1; i >= 0; i--) {
            this.siftDown(i);
        }
    }

    private siftUp(i: number): void {
        const { heap, cmp } = this;
        let idx = i;
        const val = heap[idx];
        while (idx > 0) {
            const parent = (idx - 1) >> 1;
            const p = heap[parent];
            if (cmp(val, p) < 0) {
                heap[idx] = p;
                idx = parent;
            } else break;
        }
        heap[idx] = val;
    }

    private siftDown(i: number): void {
        const { heap, cmp } = this;
        const n = heap.length;
        let idx = i;
        const val = heap[idx];
        while (true) {
            const l = (idx << 1) + 1;
            const r = l + 1;
            if (l >= n) break;
            let best = l;
            if (r < n && cmp(heap[r], heap[l]) < 0) best = r;
            if (cmp(heap[best], val) < 0) {
                heap[idx] = heap[best];
                idx = best;
            } else break;
        }
        heap[idx] = val;
    }
}

// Common comparators
export const numberMinComparator: Comparator<number> = (a, b) => a - b;
export const numberMaxComparator: Comparator<number> = (a, b) => b - a;

/** Create a min-heap priority queue for numbers. */
export function minHeap(numbers?: Iterable<number>): PriorityQueue<number> {
    return new PriorityQueue<number>(numberMinComparator, numbers);
}

/** Create a max-heap priority queue for numbers. */
export function maxHeap(numbers?: Iterable<number>): PriorityQueue<number> {
    return new PriorityQueue<number>(numberMaxComparator, numbers);
}

/** Build a comparator by object key selector for min-heap behavior. */
export function byKey<T>(key: (t: T) => number): Comparator<T> {
    return (a, b) => key(a) - key(b);
}

/** Build a comparator by object key selector for max-heap behavior. */
export function byKeyDesc<T>(key: (t: T) => number): Comparator<T> {
    return (a, b) => key(b) - key(a);
}
