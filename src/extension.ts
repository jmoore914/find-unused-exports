import * as vscode from 'vscode';
import {getAllExports} from './extractExports';
import {getUnusedExports} from './extractImports';
import {formatOutputString, printOutputString} from './extractShared';

export function activate(context: vscode.ExtensionContext): void {
	const outputChannel = vscode.window.createOutputChannel('Unused Exports');
	const disposable = vscode.commands.registerCommand('extension.findUnusedExports', async () => {
		const exports = await getAllExports();
		const unusedExports = await getUnusedExports(exports);
		if(unusedExports.length === 0){
			vscode.window.showInformationMessage('No unused exports!');
		}
		else{
			const sortedExports = formatOutputString(unusedExports);
			printOutputString(sortedExports, outputChannel);
			const showOutputItem: vscode.MessageItem = {title: 'Show'};
			vscode.window.showErrorMessage('Unused exports found!', showOutputItem).then(() => outputChannel.show());
				
		}
	});

	context.subscriptions.push(disposable);
}


export function deactivate(): void { }


