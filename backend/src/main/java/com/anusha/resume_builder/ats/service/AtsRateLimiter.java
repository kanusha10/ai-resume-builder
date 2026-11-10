package com.anusha.resume_builder.ats.service;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class AtsRateLimiter {

    private final int maxRequests;
    private final long windowMillis;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public AtsRateLimiter(int maxRequests, Duration window) {
        this.maxRequests = maxRequests;
        this.windowMillis = window.toMillis();
    }

    public long tryAcquire(String key) {
        long now = System.currentTimeMillis();
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());

        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > windowMillis) {
                q.pollFirst();
            }
            if (q.size() >= maxRequests) {
                return Math.max(1, (windowMillis - (now - q.peekFirst())) / 1000);
            }
            q.addLast(now);
            return 0;
        }
    }
}