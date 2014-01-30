package org.chromium.devtools.jsdoc;

import com.google.javascript.rhino.head.CompilerEnvirons;
import com.google.javascript.rhino.head.IRFactory;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.AstRoot;

import org.chromium.devtools.jsdoc.checks.ContextTrackingValidationCheck;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.StringReader;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;

public class FileCheckerCallable implements Callable<ValidatorContext> {

    private final String fileName;

    public FileCheckerCallable(String fileName) {
        this.fileName = fileName;
    }

    @Override
    public ValidatorContext call() {
        try {
            ValidatorContext context = new ValidatorContext(readScriptText(), fileName);
            AstRoot node = parseScript(context);
            ValidationCheckDispatcher dispatcher = new ValidationCheckDispatcher(context);
            dispatcher.registerCheck(new ContextTrackingValidationCheck());
            node.visit(dispatcher);
            dispatcher.flush();
            return context;
        } catch (FileNotFoundException e) {
            logError("File not found: " + fileName);
        } catch (IOException e) {
            logError("Failed to read file " + fileName);
        }
        return null;
    }

    private ScriptText readScriptText() throws IOException {
        byte[] encoded = Files.readAllBytes(FileSystems.getDefault().getPath(fileName));
        String text = StandardCharsets.UTF_8.decode(ByteBuffer.wrap(encoded)).toString();
        return new ScriptText(text);
    }

    private static AstRoot parseScript(ValidatorContext context) throws IOException {
        CompilerEnvirons env = new CompilerEnvirons();
        env.setRecoverFromErrors(true);
        env.setGenerateDebugInfo(true);
        env.setRecordingLocalJsDocComments(true);
        env.setAllowSharpComments(true);
        env.setRecordingComments(true);
        IRFactory factory = new IRFactory(env);
        return factory.parse(new StringReader(context.scriptText.text), context.scriptFileName, 1);
    }

    private static void logError(String message) {
        System.err.println("ERROR: " + message);
    }

    private static class ValidationCheckDispatcher extends DoDidVisitorAdapter {
        private final List<ValidationCheck> checks = new ArrayList<>(2);
        private final ValidatorContext context;

        public ValidationCheckDispatcher(ValidatorContext context) {
            this.context = context;
        }

        public void registerCheck(ValidationCheck check) {
            check.setContext(context);
            checks.add(check);
        }

        @Override
        public void doVisit(AstNode node) {
            for (DoDidNodeVisitor visitor : checks) {
                visitor.doVisit(node);
            }
        }

        @Override
        public void didVisit(AstNode node) {
            for (ValidationCheck check : checks) {
                check.didVisit(node);
            }
        }
    }
}
