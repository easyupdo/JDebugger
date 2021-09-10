// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

const vscode = require('vscode');

const fs = require('fs');

// const {Worker,isMainThread,workerData,parentPort} = require('worker_threads');


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "jsnippets" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	
	let launch_disposable = vscode.commands.registerCommand('jsnippets.genlaunch',function(){
		modify_launch_from_conf(get_conf());
		context.subscriptions.push(launch_disposable);

	})
	let tasks_disposable = vscode.commands.registerCommand('jsnippets.gentasks',function (){
		modify_tasks_from_conf(get_conf());
		context.subscriptions.push(tasks_disposable);
	})
	let startgdbserver_disposable = vscode.commands.registerCommand('jsnippets.startgdbserver',function (){
		start_gdbserver(get_conf());
		context.subscriptions.push(startgdbserver_disposable);
	})
	
	let gencode_disposable = vscode.commands.registerCommand('jsnippets.gencode',function(uri){
		console.log(uri)
		generate_code_from_xml(uri.path,get_conf())
		context.subscriptions.push(gencode_disposable);
	})

	let debug_disposable = vscode.commands.registerCommand('jsnippets.debug',function(uri){
		console.log(uri)
		start_debug(uri.path);
		context.subscriptions.push(debug_disposable);
	})
	let build_disposable = vscode.commands.registerCommand('jsnippets.build',function(uri) {
		console.log(uri)
		build_code(uri.path);
		context.subscriptions.push(build_disposable);
	})

	let disposable = vscode.commands.registerCommand('jsnippets.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from JSnippets!');

		//TODO User
		// if (isMainThread) {
		// 	// This code is executed in the main thread and not in the worker.
			
		// 	// Create the worker.
		// 	const worker = new Worker(__filename);
		// 	// Listen for messages from the worker and print them.
		// 	worker.on('message', (msg) => { console.log(msg); });
		//   } else {
		// 	// This code is executed in the worker and not in the main thread.
			
		// 	// Send a message to the main thread.
		// 	parentPort.postMessage('Hello world!');
		//   }
		


	});
	

	context.subscriptions.push(disposable);
}

function get_conf(){
	var conf = vscode.workspace.getConfiguration('JDebugConf')
	var user = conf.get('user');
	return conf
}

function start_debug(proj_path) {
	//Build
	let debug_mode = build_code(proj_path);
	//
	// vscode.debug.onDidStartDebugSession((debug_session) => {
	// 	console.log('Debug start over!');
	// });

	//start remote gdbserver in term
	if(debug_mode == 'start_remote_debug') {
		setTimeout(()=>{
			start_gdbserver(get_conf());
		},3500);
	}
}

function read_json(json_file,error_string) {
	let debug_launch
	try{
		debug_launch = fs.readFileSync(json_file,"utf-8");
	}catch(e){
		vscode.window.showErrorMessage(json_file + ' read failed!');

	}
		let debug_launch_json;
	try {
		debug_launch_json = JSON.parse(debug_launch);
	}catch(e) {
		vscode.window.showErrorMessage(error_string);
		return
	}
	return debug_launch_json;
}
// Func: execute task with vscode.Task()
function execute_task() {
	let task_definition = {
		type:'shell',
		id:'shell',//type,commnd

	}
	let shell_command='ls'
	let shell_args=['-lh']
	let options={cwd:'${workspaceFolder}'}
	let tasl_shell_execution = new vscode.ShellExecution(shell_command,shell_args,options);
	
	let task_workspace_folder_tmp = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(vscode.workspace.rootPath))
	let task_workspace_folder;
	if(task_workspace_folder != 'undefined') {
		task_workspace_folder = task_workspace_folder_tmp;
	}
	let task_workspace = vscode.workspace;
	let task_name = '11'
	let task_source = 'Workspace'
	let task_problem_matchers=[]
	let t_s = new vscode.Task(task_definition,task_workspace_folder,task_name,task_source,tasl_shell_execution,task_problem_matchers)
	t_s.presentationOptions = {
		echo: true,
		reveal: 1,//"always"
		focus: false,
		panel: 2,//"dedicated",
		showReuseMessage: true,
		clear: false
	}
	

	vscode.tasks.executeTask(t_s);
}

function build_code(proj_path) {
	let wsf = vscode.workspace.workspaceFolders;
	let wsp = proj_path;
	let index = wsp.lastIndexOf('/')
	let dir = wsp.substr(index + 1,wsp.length);
	
	let find_dir_index = -1;
	for(let i in wsf) {
		if(wsf[i].name == dir) {
			find_dir_index = Number(i);
			break;
		}
	}
	let file  = wsp + '/.vscode/launch.json';
	if(!fs.existsSync(file)) {
		vscode.window.showInformationMessage('No launch.json, Please set the launch.json');
		return
	}

	//read_json
	let debug_launch_json = read_json(file,file+' parse error, Please check file')
	let launch_name = debug_launch_json['configurations'][0]['name'];

	
	//#### Scheme 1 startDebugging
	//start debug from launch
	vscode.debug.startDebugging(wsf[find_dir_index],launch_name);
	
	/*
	//####  Scheme 2 task

	let tasks = vscode.tasks.fetchTasks().then(tasks=>{
		console.log('tasks:'+tasks);
		console.log('size:'+tasks.length);
		for(let i in tasks) {
			if(tasks[i].name == 'start_remote_debug') {
				//exec task
				console.log(tasks[i].name)
				vscode.tasks.executeTask(tasks[i]);
				break;
			}
		}
	});
	*/

	//run tasks
	// execute_task()

	// vscode.tasks.executeTask()
	let debug_mode =debug_launch_json['configurations'][0]['preLaunchTask'];
	return debug_mode
}

function generate_code_from_xml(proj_path,ui_conf){
	//uri.path
	if(typeof(proj_path) == 'undefined') {
		vscode.window.showInformationMessage('Failed to obtain path ! Exit');
		return
	}

	// if .project
	let proj = proj_path + '/.project';
	if (!fs.existsSync(proj)) {
		vscode.window.showInformationMessage('Can Not Generated ! The Project Path Is Error! Exit');
		return;
	}

	//skd_path
	let sdk_path = ui_conf.get('sdk_path')///",

	let java_path = sdk_path + '/features/com.huawei.mdc.devstudio.jre_1.0.0/jre/bin/java';
	let jar_plugin_path = sdk_path + '/plugins/org.eclipse.equinox.launcher_1.5.600.v20191014-2022.jar';
	let cmd_ = java_path + " -jar "+jar_plugin_path+" -nosplash -application com.huawei.mdc.commands.application gen -i " + proj_path + " -o "+proj_path;
	vscode.window.showInformationMessage('cmd:'+cmd_);

	vscode.window.showInformationMessage('generate code from '+proj_path,'Yes','No').then((select)=>{
		if(select == 'Yes') {
			//terminal
			let d_terminal;
			let is_find = false;
			for(let t in vscode.window.terminals){
				if(vscode.window.terminals[t].name == 'bash'){
					is_find = true;
					d_terminal = vscode.window.terminals[t];
					break;
				}
			}
			if(!is_find){
				d_terminal = vscode.window.createTerminal({name:"bash"});
				d_terminal.show(true);
			}
			d_terminal.sendText(cmd_);
		}else{
			vscode.window.showInformationMessage('Cancel generated code from '+proj_path);
		}
	})
}


function start_gdbserver(ui_conf){
	//Get GDBServer
	let cmd_='';
	let ui_cmd = ui_conf.get('gdbserver_cmd');
	

	if(ui_cmd.length > 0) {
		cmd_ = ui_cmd;
	}else {
		let r_path = vscode.workspace.rootPath
		let r_tasks_file = r_path + '/.vscode/tasks.json';
		// var tasks = fs.readFileSync(r_tasks_file,'utf-8');//Read tasks.json
	
		// let tasks_data_json;
		// try{
		// 	tasks_data_json = JSON.parse(tasks);
		// }catch(e) {
		// 	vscode.window.showErrorMessage(r_tasks_file + 'parse error, Please check file');
		// 	return
		// }
		let tasks_data_json = read_json(r_tasks_file,r_tasks_file + ' parse error, Please check file')
			//gdbserver cmd
		let tasks_cmd = 'sshpass '
		for(let x in tasks_data_json['tasks']){
			let label = tasks_data_json['tasks'][x]['label'];
			if (label == 'gdbserver') {
				for(let argi in tasks_data_json['tasks'][x]['args']){
					tasks_cmd += tasks_data_json['tasks'][x]['args'][argi]+" ";
				}
				break;
			}
		}
		cmd_ = tasks_cmd;
	}


	//terminal
	let d_terminal;
	let is_find = false;
	for(let t in vscode.window.terminals){
		if(vscode.window.terminals[t].name == 'JDebugServer'){
			is_find = true;
			d_terminal = vscode.window.terminals[t];
			break;
		}
	}
	if(!is_find){
		d_terminal = vscode.window.createTerminal({name:"JDebugServer"});
		d_terminal.show(true);
	}
	d_terminal.sendText(cmd_);
}

function modify_launch_from_conf(ui_conf) {
	// Get conf file from template
	let extension_path = vscode.extensions.getExtension("easyup.jsnippets").extensionPath
	let p = extension_path + '/conf/launch.json';


	let launch_data_json = read_json(extension_path,'launch template file parse error, Please check file')
		//launch program
	let launch_program = ui_conf.get('loc_ws')+'/'+ui_conf.get('file')
	launch_data_json['configurations'][0]['program'] = launch_program;
	//launch remote host:port
	let host_port = ui_conf.get('host')+':'+ui_conf.get('port')
	launch_data_json['configurations'][0]['miDebuggerServerAddress'] = host_port;

	let js_string = JSON.stringify(launch_data_json,null,2)

	let w_path = vscode.workspace.rootPath
	let w_launch_file = w_path + '/.vscode/launch.json';

	try{
		fs.writeFileSync(w_launch_file,js_string,'utf-8');
	}catch(e){
		vscode.window.showErrorMessage(w_launch_file + ' write failed!');
	}
}

function modify_tasks_from_conf(ui_conf) {
	// Get conf file from template
	let extension_path = vscode.extensions.getExtension("easyup.jsnippets").extensionPath
	let tasks_path = extension_path + '/conf/tasks.json';

	let tasks_data_json = read_json(tasks_path,'tasks template file parse error, Please check file')

	for(let x in tasks_data_json['tasks']){
		console.log("x=",x)
		let x_t = tasks_data_json['tasks'][x];
		let label = tasks_data_json['tasks'][x]['label'];
		if (label == 'gdbserver') {
			//TODO modify gdbserver conf
			// passwd
			tasks_data_json['tasks'][x]['args'][1] = ui_conf.get('passwd');
			let user_passwd = ui_conf.get('user') + '@' + ui_conf.get('host');
			//user@host
			tasks_data_json['tasks'][x]['args'][4] = user_passwd;
			let remote_cmd = '/usr/bin/gdbserver ' + ui_conf.get('host')+':'+ui_conf.get('port')+' '+ui_conf.get('rmt_ws')+'/'+ui_conf.get('file')
			///user/bing/gdbserver user@host cmd
			tasks_data_json['tasks'][x]['args'][5] = remote_cmd;
		}else if(label == 'deploy') {
			//TODO modify deploy conf
			// passwd
			tasks_data_json['tasks'][2]['args'][1] = ui_conf.get('passwd');
			let loc_file = ui_conf.get('loc_ws')+ '/' + ui_conf.get('file');
			//local file
			tasks_data_json['tasks'][2]['args'][4] = loc_file;
			//user@host:port remote_ws
			let remote_address = ui_conf.get('user')+'@'+ui_conf.get('host')+':'+ui_conf.get('rmt_ws')
			tasks_data_json['tasks'][2]['args'][5] = remote_address;
		}else if(label == 'build') {
			//TODO modify build conf
			let build_dir='';
			if(ui_conf.get('platform') == '610'){
				build_dir = ui_conf.get('loc_ws')+'/'+'build/cmake-build-debug-default_toolchain';
			}else if(ui_conf.get('platform') == '310') {
				build_dir = ui_conf.get('loc_ws');
			}
			//buid_dir
			tasks_data_json['tasks'][x]['args'][0] = build_dir;
			//build_params
			let build_params = ui_conf.get('build_params');
			tasks_data_json['tasks'][x]['args'][5] = build_params;
		}else {
			continue;
		}

	}
	//Write tasks.json
	let w_path = vscode.workspace.rootPath
	let w_tasks_file = w_path + '/.vscode/tasks.json';

	let js_string = JSON.stringify(tasks_data_json,null,2)

	try {
		fs.writeFileSync(w_tasks_file,js_string,'utf-8');
	}catch(e){
		vscode.window.showErrorMessage(w_tasks_file+" write failed!");
	}
	console.log(tasks_data_json);


}


// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
