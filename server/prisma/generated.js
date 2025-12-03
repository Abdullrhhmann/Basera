const generated = require('../generated/prisma');

const { Prisma } = generated;

const enumNames = [
  'UserRole',
  'PropertyType',
  'PropertyStatus',
  'DeveloperStatus',
  'Currency',
  'PropertyApprovalStatus',
  'VideoAssociationType',
  'PlaylistType',
  'ConversationStatus',
  'NewsletterSource',
  'JobStatus',
  'JobType',
  'LaunchStatus',
  'LaunchPropertyType',
];

const ensureEnumKeys = (enumName) => {
  const enumValues = generated[enumName];
  if (!enumValues || !Prisma) {
    return;
  }

  if (!Prisma[enumName]) {
    Prisma[enumName] = {};
  }

  for (const key of Object.keys(enumValues)) {
    Prisma[enumName][key] = key;
  }
};

enumNames.forEach(ensureEnumKeys);

module.exports = generated;

