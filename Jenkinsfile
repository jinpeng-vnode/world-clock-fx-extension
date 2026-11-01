// world-clock-fx-extension 流水线：只盯 dev，两步——单元测试、打包；zip 存成构建产物。
// 不部署，不用任何凭据。直接用节点上的 node（要求 node 24 以上），不用 docker。
pipeline {
    agent any
    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }
    environment {
        HOME = "${env.WORKSPACE}"
        npm_config_cache = "${env.WORKSPACE}/.npm"
    }
    stages {
        stage('单元测试') {
            when { anyOf { branch 'dev'; expression { env.GIT_BRANCH ==~ /(origin\/)?dev/ } } }
            steps {
                sh 'node -v'
                sh 'npm -v'
                sh 'npm test'
            }
        }
        stage('打包') {
            when { anyOf { branch 'dev'; expression { env.GIT_BRANCH ==~ /(origin\/)?dev/ } } }
            steps {
                sh 'rm -rf dist'
                sh 'npm run pack'
            }
        }
    }
    post {
        success {
            archiveArtifacts artifacts: 'dist/*.zip', fingerprint: true, onlyIfSuccessful: true
        }
    }
}