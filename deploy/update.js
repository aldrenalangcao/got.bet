var utils = require('shipit-utils');
var path = require('path');
var moment = require('moment');
var chalk = require('chalk');
var _ = require('lodash');
var util = require('util');
var Promise = require('bluebird');

/**
 * Update task.
 * - Set previous release.
 * - Set previous revision.
 * - Create and define release path.
 * - Set current revision and write REVISION file.
 * - Remote copy project.
 */

module.exports = function (gruntOrShipit) {
    utils.registerTask(gruntOrShipit, 'deploy:update-local', task);

    function task() {
        var shipit = utils.getShipit(gruntOrShipit);

        _.assign(shipit.constructor.prototype, require('shipit-deploy/lib/shipit'));

        return setPreviousRelease()
            .then(setPreviousRevision)
            .then(createReleasePath)
            .then(remoteCopy)
            .then(function () {
                shipit.emit('updated');
            });


        function createReleasePath() {
            shipit.releaseDirname = moment.utc().format('YYYYMMDDHHmmss');
            shipit.releasePath = path.join(shipit.releasesPath, shipit.releaseDirname);

            shipit.log('Create release path "%s"', shipit.releasePath);

            return shipit.remote('mkdir -p ' + shipit.releasePath)
                .then(function () {
                    shipit.log(chalk.green('Release path created.'));
                });
        }

        /**
         * Remote copy project.
         */

        function remoteCopy() {
            var uploadDirPath = path.resolve(shipit.config.workspace, shipit.config.dirToCopy || '');

            shipit.log('Copy project to remote servers.');

            return shipit.remoteCopy(uploadDirPath + '/', shipit.releasePath, {rsync: '--del'})
                .then(function () {
                    shipit.log(chalk.green('Finished copy.'));
                });
        }

        /**
         * Set shipit.previousRevision from remote REVISION file.
         */

        function setPreviousRevision() {
            shipit.previousRevision = null;

            if (!shipit.previousRelease) {
                return Promise.resolve();
            }

            return shipit.getRevision(shipit.previousRelease)
                .then(function(revision) {

                    if (revision) {
                        shipit.log(chalk.green('Previous revision found.'));
                        shipit.previousRevision = revision;
                    }
                });
        }

        /**
         * Set shipit.previousRelease.
         */

        function setPreviousRelease() {
            shipit.previousRelease = null;

            return shipit.getCurrentReleaseDirname()
                .then(function(currentReleasseDirname) {
                    if (currentReleasseDirname) {
                        shipit.log(chalk.green('Previous release found.'));
                        shipit.previousRelease = currentReleasseDirname;
                    }
                });
        }

    }
};
