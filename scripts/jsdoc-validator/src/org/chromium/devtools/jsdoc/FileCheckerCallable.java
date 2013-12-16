package org.chromium.devtools.jsdoc;

import com.google.javascript.rhino.head.CompilerEnvirons;
import com.google.javascript.rhino.head.IRFactory;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.AstRoot;

import org.chromium.devtools.jsdoc.checks.RequiredThisAnnotationCheck;

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

class FileCheckerCallable implements Callable<ValidatorContext> {

    private final String fileName;

    public FileCheckerCallable(String fileName) {
        this.fileName = fileName;
    }

    @Override
    public ValidatorContext call() throws Exception {
        try {
            ValidatorContext context = new ValidatorContext(readScriptText(), fileName);
            AstRoot node = parseScript(context);
            DispatchingVisitor dispatchingVisitor = new DispatchingVisitor();
            dispatchingVisitor.registerVisitor(new RequiredThisAnnotationCheck(context));
            node.visit(dispatchingVisitor);
            dispatchingVisitor.flush();
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

    private static class DispatchingVisitor extends DoDidVisitorAdapter {
        private final List<DoDidNodeVisitor> visitors = new ArrayList<>(2);

        public void registerVisitor(DoDidNodeVisitor visitor) {
            visitors.add(visitor);
        }

        @Override
        public void doVisit(AstNode node) {
            for (DoDidNodeVisitor visitor : visitors) {
                visitor.doVisit(node);
            }
        }

        @Override
        public void didVisit(AstNode node) {
            for (DoDidNodeVisitor visitor : visitors) {
                visitor.didVisit(node);
            }
        }
    }
}