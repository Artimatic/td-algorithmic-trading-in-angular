module.exports = {
    apps: [
      {
        name: "trader-main",
        script: "dist/app.js",
        instances: 3,
        exec_mode: "cluster",
        watch: ".",
      },
    ],
    deploy: {
      production: {
        user: "YOUR_SSH_USERNAME_HERE",
        host: "YOUR_SSH_HOST_ADDRESS",
        ref: "YOUR_GIT_BRANCH_REF (eg: origin/master)",
        repo: "GIT_REPOSITORY",
        path: "YOUR_DESTINATION_PATH_ON_SERVER",
        "pre-deploy-local": "",
        "post-deploy":"npm install && pm2 reload ecosystem.config.js --env production",
        "pre-setup": "",
      },
    },
  };