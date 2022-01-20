import {FakeFilesCollection} from "../githubServiceFiles/FakeFilesCollection";
import {FakeTempDir} from "../githubServiceFiles/FakeTempDir";
import {EnvInterface} from "../types/EnvInterface";
import {EnvStore} from "../stores/EnvStore";
import {RunOptions} from "../runOptions/RunOptions";
import {ActionConfigStoreOptional} from "../stores/ActionConfigStore";
import {ExecutionEffectsInterface} from "./ExecutionEffectsInterface";
import * as path from "path";

export class AbstractExecutionEnvironment {
    public readonly fakeFiles: FakeFilesCollection;
    public readonly tempDir: FakeTempDir|undefined = undefined;
    public readonly cleanUpTempDir: boolean;
    public readonly env: EnvInterface;

    protected constructor(
        options: RunOptions,
        actionConfig: ActionConfigStoreOptional|undefined,
        actionYmlPath: string|undefined
    ) {
        const envStore = new EnvStore(options.env.data);
        if (actionConfig !== undefined) {
            envStore.apply(actionConfig.getDefaultInputs().toEnvVariables());
        }
        if (options.fakeFileOptions.data.unsetCommandFilesEnvs) {
            envStore.unsetFileCommandPaths();
        }
        envStore.apply(options.inputs.toEnvVariables());
        envStore.apply(options.state.toEnvVariables());

        let githubServiceEnv = options.githubServiceEnv;
        if (options.shouldFakeMinimalGithubRunnerEnv) {
            let actionYmlPathEnvValue = undefined;
            if (actionConfig?.data?.runs?.using === 'composite' && actionYmlPath) {
                actionYmlPathEnvValue = path.resolve(path.dirname(actionYmlPath));
            }
            githubServiceEnv = options.githubServiceEnv.clone().fakeMinimalRunnerEnv(actionYmlPathEnvValue);
        }
        envStore.apply(githubServiceEnv.data);

        this.fakeFiles = options.fakeFileOptions.data.fakeCommandFiles
            ? FakeFilesCollection.createCommandFiles()
            : new FakeFilesCollection();

        const githubContext = options.shouldFakeMinimalGithubRunnerEnv
            ? options.githubContext.clone().fakeMinimalRunnerContext(actionConfig?.data?.name)
            : options.githubContext;

        const githubContextExport = githubContext.export();
        if (githubContextExport.eventPayloadFile) {
            this.fakeFiles.add(githubContextExport.eventPayloadFile);
        }
        envStore.apply(githubContextExport.envVariables);

        envStore.apply(this.fakeFiles.getEnvVariables());
        if (options.fakeFileOptions.data.fakeTempDir) {
            this.tempDir = FakeTempDir.create();
            envStore.apply(this.tempDir.dirPathEnvVariable);
        }
        this.env = envStore.data;
        this.cleanUpTempDir = options.fakeFileOptions.data.cleanUpTempDir;
    }

    getEffects(): ExecutionEffectsInterface {
        return {
            fileCommands: this.fakeFiles.readFileCommands(),
            tempDir: this.tempDir
        };
    }

    restore() {
        this.fakeFiles.cleanUpFiles();
        if (this.cleanUpTempDir && this.tempDir) {
            this.tempDir.delete();
        }
    }
}