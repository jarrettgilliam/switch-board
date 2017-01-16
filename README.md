switch-board
============

*Share a home server with friends, greenly*

**switch-board** attempts to grant multiple users access to a home server, without leaving it on all the time. It gives predefined users a web page where they can start and stop using a server. When someone starts using a server, it turns on. When the last person leaves, it turns off.

Screenshots
-----------

![Offline](https://cloud.githubusercontent.com/assets/5099690/21415831/51d47dba-c7d3-11e6-82bc-d6462d7422cd.png "Offline")

![Online](https://cloud.githubusercontent.com/assets/5099690/21415832/51d50d84-c7d3-11e6-9d64-05b665ad3300.png "Online")


Prerequisites
-------------

In most cases, this app will live on a low powered, always on, device on your local network (like a [raspberry pi][1]). For lack of a better term, I'll call this device *Switchy*. This device must have password-less `ssh` access to the home servers it will be powering on/off. Also, the servers must support Wake-on-LAN. If they don't, this app won't help you.

### Wake-on-LAN

I won't say much about this since it's largely dependent on your hardware. Normally there is a setting for this in the BIOS/UEFI for your motherboard if it's supported. Read your motherboard's manual or check Google if you have trouble, but please don't create an issue for this.

### SSH

#### Home Server Configuration

For security purposes, I recommend creating a user specifically for this app.

```sh
sudo useradd --system --create-home --shell "$(which bash)" switch-board
sudo passwd switch-board
```

Now log in with the newly created user.

```sh
sudo login switch-board
```

Now we need to prepare for a password-less login from *Switchy*. To do this, first verity that `PubkeyAuthentication` is `yes` in the file `/etc/ssh/sshd_config`, then do the following.

```sh
mkdir ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Lastly, we need to give our new user password-less access to the `poweroff` command. From a root shell execute `visudo` and add this line to the end:

```
switch-board ALL=(ALL) NOPASSWD: /sbin/poweroff
```

#### Switchy Configuration

I recommend creating a user for this system as well.

```sh
sudo useradd --system --create-home --shell "$(which bash)" switch-board
```

I'll leave the user without a password (you don't have to) and log in with `sudo`

```sh
sudo -iHu switch-board
```

Now generate a key pair for ssh

```sh
ssh-keygen -t rsa
```

It will ask for a save location and passphrase. You can just enter through the prompts.

Lastly, copy the public key to your home server with the following command

```sh
cat .ssh/id_rsa.pub | ssh switch-board@HOME_SERVER 'cat >> .ssh/authorized_keys'
```

The SSH configuration is finished. You should be able to log in from *Switchy* to your home server over ssh without being asked for a password.

Installation
------------

Once everything it set up, the installation is pretty simple. Make sure [git][3] and [node.js][4] are installed

```sh
git clone https://github.com/jarrettgilliam/switch-board
cd switch-board
npm install
```

Configuration
-------------

### switch-board

siwtch-board's configuration is file driven. By default, it will look for the file `~/.config/switch-board/config.json`. The configuration file can also be specified with the `--config` option.

The most basic configuration file will look something like this.

```json
{
  "users": [
    {
      "name": "My User",
      "username": "myuser",
      "password": "password"
    }
  ],
  "hosts": [
    {
      "name": "Home Server",
      "hostname": "192.168.0.1",
      "macaddress": "00:00:00:00:00:00",
      "sshuser": "switch-board"
    }
  ]
}
```

This specifies a single user and a single host, accepting all the defaults.

A more advanced configuration with all options specified looks like this.

```json
{
  "port": 3001,
  "users": [
    {
      "name": "Admin",
      "username": "admin",
      "password": "5f4dcc3b5aa765d61d8327deb882cf99",
      "password_encoding": "md5",
      "admin": true
    },
    {
      "name": "Automation",
      "username": "auto",
      "password": "5f4dcc3b5aa765d61d8327deb882cf99",
      "password_encoding": "md5"
    }
  ],
  "hosts": [
    {
      "name": "Home Server",
      "hostname": "server",
      "macaddress": "00:00:00:00:00:00",
      "sshuser": "switch-board",
      "sshport": 2222,
      "sshkey": "/home/switch-board/.ssh/id_rsa",
      "poweroff_command": "sudo poweroff"
    }
  ]
}
```

This states that switch-board should listen on port 3001. It specifies two users, Admin and Automation. Admin has the `admin` flag set to `true`, meaning he has the option to power hosts on and off directly, even when other users are using that host. With `password_encoding` set to `md5`, passwords can be stored as a hash instead of plain text. Passwords can be generated with the following command.

```
echo -n 'password' | md5sum
```

The configuration also specifies one host. This is mostly the same as before, except the `sshport`, `sshkey`, and `poweroff_command` fields are set explicitly.

At this point, you should have everything you need installed and configured. The app can be started with the following command.

```sh
node ~switch-board/switch-board/app.js
```

### Reverse Proxy

Since switch-board doesn't have an SSL/TLS option, I **_highly_** recommend using a reverse proxy with SSL/TLS enabled if you plan to use this over the internet. It's fairly simple using `nginx`.

```
location /switch-board {
    proxy_pass http://HOST:PORT/switch-board;
    error_log /var/log/nginx/switch-board.log;
}
```

API
---

This app was written with automation in mind. It uses a simple web API that can be consumed by most languages and environments.

For example, to power on your home server on a schedule, you could add the following lines to `cron`

```
# Power on host `0` at 2:00 am every morning
0 2 * * * curl -L -sS -X POST -u USER:PASSWORD http://HOST:PORT/switch-board/api/usehost/0 >/dev/null

# Power off host `0` at 4:00 am every morning
0 4 * * * curl -L -sS -X POST -u USER:PASSWORD http://HOST:PORT/switch-board/api/unusehost/0 >/dev/null
```

Authentication is done using [basic auth][2]. This means that every request to switch-board must have an http header similar to this.

```
Authorization: Basic dXNlcjpwYXNzd29yZA==
```

Where `dXNlcjpwYXNzd29yZA==` is the username and password concatinated with a colon between them, then base64 encoded.


#### Listing Hosts

HTTP Method: `GET`

URL Endpoint: `http://HOST:PORT/switch-board/api/hosts`

Example Response:

```json
[
    {
        "id": "0",
        "name": "Home Server"
    }
]
```

### Listing User Permissions

HTTP Method: `GET`

URL Endpoint: `http://HOST:PORT/switch-board/api/user`

Example Response:

```json
{
    "admin": false
}
```

### Getting a Host's Status

HTTP Method: `GET`

URL Endpoint: `http://HOST:PORT/switch-board/api/status/HOSTID`

HOSTID is any valid id returned from the `hosts` call. In this example, the only valid id is `0`.

Example Response:

```json
{
    "status": "online",
    "using": true,
    "users": [
        "My User"
    ]
}
```

### Start Using a Host

HTTP Method: `POST`

URL Endpoint: `http://HOST:PORT/switch-board/api/usehost/HOSTID`

Example Response:

```json
{
  "status": "success"
}
```

### Stop Using a Host

HTTP Method: `POST`

URL Endpoint: `http://HOST:PORT/switch-board/api/unusehost/HOSTID`

Example Response:

```json
{
  "status": "success"
}
```

### Powering Off a Host

*Note: only admins can do this.*

HTTP Method: `POST`

URL Endpoint: `http://HOST:PORT/switch-board/api/poweroff/HOSTID`

Example Response:

```json
{
  "status": "success"
}
```

### Powering On a Host

*Note: only admins can do this.*

HTTP Method: `POST`

URL Endpoint: `http://HOST:PORT/switch-board/api/poweron/HOSTID`

Example Response:

```json
{
  "status": "success"
}
```

[1]: https://www.raspberrypi.org/products/
[2]: https://en.wikipedia.org/wiki/Basic_access_authentication
[3]: https://git-scm.com/
[4]: https://nodejs.org/
