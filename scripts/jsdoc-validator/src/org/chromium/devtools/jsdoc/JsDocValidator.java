/**
 * Validator for Closure-based JSDoc.
 */

package org.chromium.devtools.jsdoc;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.SortedSet;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class JsDocValidator {

    private static final Comparator<ValidatorContext> VALIDATOR_CONTEXT_COMPARATOR =
        new Comparator<ValidatorContext>() {
            @Override
            public int compare(ValidatorContext o1, ValidatorContext o2) {
                return o1.scriptFileName.compareTo(o2.scriptFileName);
            }
        };

    private void run(String[] args) {
        ExecutorService executor =
                Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());
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

        List<ValidatorContext> results = new ArrayList<>(args.length);
        for (Future<ValidatorContext> future : futures) {
            try {
                ValidatorContext result = future.get();
                if (result != null) {
                    results.add(result);
                }
            } catch (InterruptedException e) {
                System.err.println("ERROR - " + e.getMessage());
            } catch (ExecutionException e) {
                System.err.println("ERROR - " + e.getMessage());
            }
        }

        Collections.sort(results, VALIDATOR_CONTEXT_COMPARATOR);
        for (ValidatorContext context : results) {
            SortedSet<ValidatorContext.MessageRecord> records = context.getValidationResult();
            for (ValidatorContext.MessageRecord record : records) {
                System.err.println(record.text);
            }
        }
    }

    public static void main(String[] args) {
        new JsDocValidator().run(args);
    }
}
