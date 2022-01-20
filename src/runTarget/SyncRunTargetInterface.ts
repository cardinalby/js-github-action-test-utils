import {AbstractRunResult} from "../runResult/AbstractRunResult";
import {RunOptions} from "../runOptions/RunOptions";
import {ActionConfigStoreOptional} from "../stores/ActionConfigStore";

export interface SyncRunTargetInterface {
    run(options: RunOptions): AbstractRunResult;
    clone(): this;
    actionYmlPath: string|undefined;
    actionConfig: ActionConfigStoreOptional
}

