/**
 * Validator for Closure-based JSDoc.
 */

package org.chromium.devtools.jsdoc;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.SortedSet;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class JsDocValidator {

    private void run(String[] args) {
        int threadCount = Math.min(args.length, Runtime.getRuntime().availableProcessors());
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        try {
            runWithExecutor(args, executor);
        } finally {
            executor.shutdown();
        }
    }

    private void runWithExecutor(String[] args, ExecutorService executor) {
        List<Future<ValidatorContext>> futures = new ArrayList<>(args.length);
        for (String fileName : args) {
            futures.add(executor.submit(new FileCheckerCallable(fileName)));
        }

        List<ValidatorContext> contexts = new ArrayList<>(args.length);
        for (Future<ValidatorContext> future : futures) {
            try {
                ValidatorContext context = future.get();
                if (context != null) {
                    contexts.add(context);
                }
            } catch (InterruptedException | ExecutionException e) {
                System.err.println("ERROR - " + e.getMessage());
                e.printStackTrace(System.err);
            }
        }

        int entryCount = 0;
        for (ValidatorContext context : contexts) {
            entryCount += context.getValidationResult().size();
        }
        List<LogEntry> entries = new ArrayList<>(entryCount);
        for (ValidatorContext context : contexts) {
            SortedSet<ValidatorContext.MessageRecord> records = context.getValidationResult();
            for (ValidatorContext.MessageRecord record : records) {
                entries.add(new LogEntry(context.scriptFileName, record));
            }
        }
        Collections.sort(entries);
        for (LogEntry entry : entries) {
            System.err.println(entry.record.text);
        }
        if (!entries.isEmpty())
            System.err.println("Total errors: " + entries.size());
    }

    public static void main(String[] args) {
        new JsDocValidator().run(args);
    }

    private static class LogEntry implements Comparable<LogEntry> {
        private final String fileName;
        private final ValidatorContext.MessageRecord record;

        LogEntry(String fileName, ValidatorContext.MessageRecord record) {
            this.fileName = fileName;
            this.record = record;
        }

        @Override
        public int compareTo(LogEntry other) {
            int result = fileName.compareTo(other.fileName);
            if (result != 0) {
                return result;
            }
            return Integer.compare(record.position, other.record.position);
        }

        @Override
        public int hashCode() {
            return 17 + fileName.hashCode() * 3 + this.record.hashCode() * 5;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) {
                return true;
            }
            if (obj == null) {
                return false;
            }
            if (getClass() != obj.getClass()) {
                return false;
            }
            LogEntry other = (LogEntry) obj;
            if (fileName != other.fileName
                    && (fileName != null && !fileName.equals(other.fileName))) {
                return false;
            }

            if (record == other.record) {
                return true;
            }
            if (record != null) {
                if (other.record == null) {
                    return false;
                }
                return record.position == other.record.position;
            }
            return false;
        }
    }
}
