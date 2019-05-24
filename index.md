# Node-RED Desktop

This is a desktop applicaiton of Node-RED

![screen](https://raw.githubusercontent.com/sakazuki/node-red-desktop/doc/screenshot.png)

## Download

Download the binary file from [download page](https://github.com/sakazuki/node-red-desktop/releases)

- Windows: [**Node-RED-Desktop_Setup_X.X.X.exe**](https://github.com/sakazuki/node-red-desktop/releases)
- Mac: [**Node-RED-Desktop-X.X.X.dmg**](https://github.com/sakazuki/node-red-desktop/releases)

## Your benefits

You can 
- easily setup Node-RED on your desktop.
- quickly create and discard a flow many times.
- easily integrate with cloud services with the public HTTP endpoint.
  - twilio, alexa, google home etc...

And also,

You can use almost all powerful and useful Node-RED features
  - install nodes from the [public Library](https://flows.nodered.org/) or else.
  - [projects](https://nodered.org/docs/user-guide/projects/)
  - etc.

## Node-RED-Desktop features

- [Node-RED](https://nodered.org/) v0.20.5
- [ngrok](https://ngrok.com/) integrated
- npm integrated
- multi language
  - english
  - japanese
- auto updater

## How to install Node-RED-Desktop

1. Download the installer from [release page](https://github.com/sakazuki/node-red-desktop/releases).
1. Run the installer.

## How to use Node-RED

1. the same way as Node-RED usage
1. If you are a newbee, see [Node-RED document](https://nodered.org/docs/).

## How to publish the HTTP endpoint

1. create a flow using **"http in"** and **"http response"** nodes and deploy it.
1. click **[Endpoint]-[ngrok Connect]**
1. you will get the domain such as https://1234xxxx.ngrok.com.
1. access to the above public url.

## How to enable Node-RED projects feature

- Requirement:
  - you can use git command on the shell (win:Command Prompt or mac:bash)
  - refs: [git](https://git-scm.com/downloads)

1. go **[File]-[Settings...]**
1. checked **[Projects enabled]**
1. click **[Restart to apply]**

## How to install additional nodes

1. click **[Manage pallete]-[install]**

- This function uses Node-RED Destktop builtin npm.  
Some npm modules need to be compiled from node binary or C/C++ when installing.  
In such cases, you need to install node.js before.  
If so, please install node v12.x.x from https://nodejs.org/ and retry to install them.

