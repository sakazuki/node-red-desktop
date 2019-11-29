# Node-RED Desktop

[Japanese](ja/)

This is a desktop applicaiton of Node-RED

![screen](https://raw.githubusercontent.com/sakazuki/node-red-desktop/doc/screenshot.png)

## Announce

- 2019-11-29  **1.0.0** release (Node-RED v1.0.3 with v-flow)
- 2019-11-03  **1.0.0-beta.2** release (Node-RED v1.0.2 with [vertical view](https://discourse.nodered.org/t/vertical-flow-view/5487))

## Download

Download the binary file from [download page](https://github.com/sakazuki/node-red-desktop/releases)

- Windows: [**Node-RED-Desktop_Setup_X.X.X.exe**](https://github.com/sakazuki/node-red-desktop/releases)
- Mac: [**Node-RED-Desktop-X.X.X.dmg**](https://github.com/sakazuki/node-red-desktop/releases)

## Benefits

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

- [Node-RED](https://nodered.org/) v1.0.2
- [ngrok](https://ngrok.com/) integrated
- [Node generator](https://www.npmjs.com/package/node-red-nodegen) integrated
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
1. click **[Endpoint]-[Connect ngrok]**
1. you will get the domain such as https://1234xxxx.ngrok.com.
1. access to the above public url.
- **CAVEAT** Anyone can access to this endpoint, if you don't configure httpNodeAuth in **[File|Applicetion]-[Settings...]**

## How to enable Node-RED projects feature

- Requirement:
  - you can use git command on the shell (win:Command Prompt or mac:bash)
  - refs: [git](https://git-scm.com/downloads)

1. go **[File]-[Settings...]**
1. checked **[Projects enabled]**
1. click **[Restart to apply]**

## How to install additional nodes

### from Public library
1. click **[Manage pallete]-[install]**

### from Unofficial site
1. click **[Tools]-[Add a remote node]**
1. input URL. (example: https://github.com/sakazuki/node-red-contrib-lambda-io.git)

- info: This menu executes

    ```
    npm install [url]
    ```

### from local disk
1. click **[Tools]-[Add a local node]**
1. select a node directory that includes package.json

- info: This menu executes

    ```
    npm link [dir]
    ```

## If additional nodes does not work....


- This function uses Node-RED Destktop builtin npm.  
Some npm modules need to be compiled from node binary or C/C++ when installing.  
In such cases, you need to install node.js before.  
If so, please install node v12.x.x from [Node.js official site](https://nodejs.org/) and retry to install them.
  
  You can test to use `node` command with this flow.

  ```
  [{"id":"7a4efcce.89b8c4","type":"inject","z":"c37c6de7.10798","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":140,"y":60,"wires":[["d1acddb8.e8361"]]},{"id":"d1acddb8.e8361","type":"exec","z":"c37c6de7.10798","command":"node -v","addpay":false,"append":"","useSpawn":"false","timer":"","oldrc":false,"name":"","x":320,"y":60,"wires":[["9483c8bb.2c7d58"],["9483c8bb.2c7d58"],["9483c8bb.2c7d58"]]},{"id":"9483c8bb.2c7d58","type":"debug","z":"c37c6de7.10798","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":490,"y":60,"wires":[]}]
  ```

- In some cases, the error like **NODE_MODULE_VERSION** mismatch occures.

  ```
  [2019-05-24 19:38:00.395] [warn] [node-red-node-serialport/serialport] Error: The module '\\?\C:\Users\abc\.Node-RED-Desktop\node_modules\@serialport\bindings\build\Release\bindings.node'
  was compiled against a different Node.js version using
  NODE_MODULE_VERSION 47. This version of Node.js requires
  NODE_MODULE_VERSION 70. Please try re-compiling or re-installing
  ```
  
  Then you need some step.

  ```
  ## Windows
  > npm install -g electron-rebuild
  > cd %USERPROFILE%\.Node-RED-Desktop
  > electron-rebuild --version 5.0.0
  
  ## Mac
  $ npm install -g electron-rebuild
  $ cd $USER/.Node-RED-Desktop
  $ electron-rebuild --version 5.0.0
  ```

## How to use excluded standard nodes

- You can activate them at **[Nodes exclude]** form in **[File]-[Settings...]**.  
When you activate the MQTT node, Delete `10-mqtt.js` from **[Node exclude]**.

- Default **[Nodes exclude]** is below
  ```
  10-mqtt.js
  16-range.js
  31-tcpin.js
  32-udp.js
  89-trigger.js
  node-red-node-sentiment
  node-red-node-rbe
  ```

- I have selected default **[Nodes exclude]** to simple the first look for beginners.  
There is not technical reason.


## More information

- Check also [Wiki page](https://github.com/sakazuki/node-red-desktop/wiki)
