# Firebase Group-Chat Application

This application shows how to use Firebase to build an effective prototype
demonstrating the following features.

- Allows anonymous use - but can upgrade to an email-identified account.
- Users can create public or private chat rooms.
- Room owners can make rooms:
  - Public (or private) readable.
  - Publicly joinable or invite-only.
  - Allow owner or member controlled invitiations.

# Using this Repository

## Pre-requisites

You should have these tools installed on your machine and be familiar with use
the Bash command line
([installing on Windows](http://www.windowscentral.com/how-install-bash-shell-command-line-windows-10)).

- [Git](https://git-scm.com/).
- [Node.js](https://nodejs.org/) and the [npm](npm) package manager.

Open a command-line/Terminal window and download this repo:

```
$ git clone https://github.com/mckoss/group-chat.git
$ cd group-chat
```

In order to keep this app as simple as possible, it is built as a collection of
simple single-page applications w/o the use of any JavaScript frameworks.

```
$ source tools/use
$ configure-project
$ build-project
```

Make sure firebase is setup correctly:

```
$ firebase --version
3.5.0
```

## Create Firebase Account and Configure Application.

- Go to [firebase.google.com](https://firebase.google.com).
- Click SIGN IN button and use a Google Account to sign in.
- Go to the [Firebase Console](https://console.firebase.google.com).
- Click CREATE NEW PROJECT.  Use a project name like 'koss-group-chat'
  (prefix with a username to avoid collisions with other developers).
- Enable Anonymous, Email/Password, and Google
  [sign-in methods](https://console.firebase.google.com/project/_/authentication/providers).

## Copy your App Configuration to app/config.js.

Each application has it's own configuration information to use Firebase; follow
these steps to use your own instead of the example configuration.

- Click `Add Firebase to your web app` from the
  [Overview page](https://console.firebase.google.com/project/_/overview).
- Copy the Javascript lines to the file in app/config.js (don't copy the `<script>`
  tags).

## Deploy

Verify your newly created app is listed from the command line:

```
$ firebase list
```

Make it the default app to deploy to (replace your own app name below):

```
$ firebase use --add koss-group-chat
```

Now deploy it and view it on the web:

```
$ firebase deploy
```

Visit the hosting URL as display by the deploy command (looks like
https://koss-group-chat.firebaseapp.com).
