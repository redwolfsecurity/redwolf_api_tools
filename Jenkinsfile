pipeline {

  agent {
    docker {
      alwaysPull true
      // args '--user=ff_agent'  // even if we don't specify the user to use, Jenkins build will run as "ff_agent" user.
      image '209512847919.dkr.ecr.us-east-1.amazonaws.com/redoki_base_ubuntu:latest'
      registryCredentialsId 'ecr:us-east-1:aws_credentials_jenkins_redwolf'
      registryUrl 'https://209512847919.dkr.ecr.us-east-1.amazonaws.com'
    }
  }

  stages {
    stage('Install') {
      steps {
        // Cleanup
        sh 'bash --login -c "npm cache clean --force"'
        sh 'bash --login -c "rm package-lock.json"'
        // Install dependencies
        sh 'bash --login -c "npm install"'
      }
    }

    stage('Build') {
      steps {
        // Run build
        sh 'bash --login -c "npm run build"'
      }
    }

    stage('Test') {
      steps {
        // Run tests
        sh 'bash --login -c ";npm run test"'
      }
    }

    stage('Test_Security') {
      steps {
        // Run security tests - check the production npm's.
        // This will return 0 only if there are no vulnerabilities in production packages
        sh 'bash --login -c "npm audit --production"'
      }
    }

    stage('Install build_tools') {
      environment {

        PRODUCTION_CONTENT_URL = credentials('production_content_url')
        PRODUCTION_CONTENT_S3_NPM_PATH = credentials('production_content_s3_npm_path')

        TARBALL_FILENAME = "build_tools-latest.tgz"
        TARBALL_FILEPATH = "/${PRODUCTION_CONTENT_S3_NPM_PATH}/${TARBALL_FILENAME}"
      }
      steps {
        script {
          if (env.BRANCH_NAME == 'master') {
            // Install build_tools
            sh 'bash --login -c "npm install --global ${PRODUCTION_CONTENT_URL}${TARBALL_FILEPATH}"'
          } else {
            error("Unsupported branch name: '${env.BRANCH_NAME}'")
          }
        }
      }
    }

    stage('Configure git') {
      environment{
        PRODUCTION_SUPPORT_EMAIL = credentials('production_support_email')
      }
      steps {
        // Setting git email and username (for next bump up version by command "npm version patch" to work properly)
        sh 'bash --login -c "git config --global user.email \"${PRODUCTION_SUPPORT_EMAIL}\""'
        sh 'bash --login -c "git config --global user.name jenkins"'
      }
    }

    stage('Bump up version') {
      steps {
        sh 'bash --login -c "git status"'
        sh 'bash --login -c "git checkout package-lock.json"'
        sh 'bash --login -c "npm version patch"'
      }
    }

    stage('Build and publish npm package (tarball)') {
      environment {
        // AWS credentials required to be set by npm library 'aws-sdk'
        AWS_ACCESS_KEY_ID = credentials('production_aws_access_key_id_jenkins_build')
        AWS_SECRET_ACCESS_KEY = credentials('production_aws_secret_access_key_jenkins_build')

        PRODUCTION_CONTENT_S3_BUCKET_NAME = credentials('production_content_s3_bucket_name')
        PRODUCTION_CONTENT_S3_NPM_PATH = credentials('production_content_s3_npm_path')
        PRODUCTION_CONTENT_CDN_DISTRIBUTION_ID = credentials('production_content_cdn_distribution_id')
        PRODUCTION_SUPPORT_EMAIL = credentials('production_support_email')
        TARBALL_FILENAME = "ff_api_tools-latest.tgz"
        TARBALL_FILEPATH = "/${PRODUCTION_CONTENT_S3_NPM_PATH}/${TARBALL_FILENAME}"
      }

      steps {
        script {
          if (env.BRANCH_NAME == 'master') {
            sh 'bash --login -c "build_package --no-version-bump"'
            sh 'bash --login -c "publish_package_to_cdn \"${PRODUCTION_CONTENT_S3_BUCKET_NAME}\" \"${PRODUCTION_CONTENT_S3_NPM_PATH}\" \"${PRODUCTION_CONTENT_CDN_DISTRIBUTION_ID}\""'

          } else {
            error("Unsupported branch name: '${env.BRANCH_NAME}'")
          }
        }
      }
    }
  }
}

