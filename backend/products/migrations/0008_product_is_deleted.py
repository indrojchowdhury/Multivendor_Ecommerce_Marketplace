from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0007_product_is_approved"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
    ]
