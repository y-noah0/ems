const mongoose = require('mongoose');

/**
 * Validates an entity exists and is not soft-deleted
 * @param {Model} Model - Mongoose model
 * @param {String} id - Entity ID
 * @param {String} entityName - Entity name for error message
 * @returns {Object} Entity or throws detailed error
 */
exports.validateEntity = async (Model, id, entityName = 'Entity') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${entityName} ID format: ${id}`);
    error.statusCode = 400;
    throw error;
  }

  const entity = await Model.findById(id);
  if (!entity) {
    const error = new Error(`${entityName} not found with ID: ${id}`);
    error.statusCode = 404;
    throw error;
  }

  if (entity.isDeleted) {
    const error = new Error(`${entityName} with ID ${id} has been deleted`);
    error.statusCode = 400;
    throw error;
  }

  return entity;
};

/**
 * Validates multiple entities exist and are not soft-deleted
 * @param {Model} Model - Mongoose model
 * @param {Array} ids - Array of entity IDs
 * @param {String} entityName - Entity name for error message
 * @returns {Array} Array of entities or throws detailed error
 */
exports.validateEntities = async (Model, ids, entityName = 'Entities') => {
  if (!Array.isArray(ids) || ids.length === 0) {
    const error = new Error(`At least one ${entityName.toLowerCase()} ID is required`);
    error.statusCode = 400;
    throw error;
  }

  const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    const error = new Error(`Invalid ${entityName.toLowerCase()} ID format: ${invalidIds.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const entities = await Model.find({ _id: { $in: ids } });
  
  if (entities.length !== ids.length) {
    const foundIds = entities.map(e => e._id.toString());
    const missingIds = ids.filter(id => !foundIds.includes(id));
    const error = new Error(`${entityName} not found with IDs: ${missingIds.join(', ')}`);
    error.statusCode = 404;
    throw error;
  }

  const deletedEntities = entities.filter(e => e.isDeleted);
  if (deletedEntities.length > 0) {
    const deletedIds = deletedEntities.map(e => e._id.toString());
    const error = new Error(`${entityName} with IDs ${deletedIds.join(', ')} have been deleted`);
    error.statusCode = 400;
    throw error;
  }

  return entities;
};