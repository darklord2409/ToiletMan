from fastapi import APIRouter

from app.api.v1.catalog import (
    attribute_definition,
    attribute_group,
    attribute_set,
    attribute_set_item,
    category,
    collection,
    manufacturer,
    product,
    product_attribute,
    product_document,
    product_image,
    product_label,
    product_label_assignment,
    product_recommendation,
    product_type,
    product_video,
    reference_value,
    unit,
)

router = APIRouter()
for module in (
    manufacturer,
    unit,
    category,
    product,
    product_image,
    attribute_definition,
    product_attribute,
    attribute_group,
    reference_value,
    product_type,
    collection,
    product_label,
    attribute_set,
    attribute_set_item,
    product_label_assignment,
    product_recommendation,
    product_document,
    product_video,
):
    router.include_router(module.router)
