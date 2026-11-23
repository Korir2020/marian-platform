import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('authoring', '0002_alter_lesson_options_lesson_approved_version_and_more'),
        ('catalog', '0002_course_level_course_status_module_status_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(name='Assessment', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('title', models.CharField(max_length=200)), ('description', models.TextField(blank=True)),
            ('kind', models.CharField(choices=[('quiz','Quiz'),('module','Module assessment'),('final','Final assessment'),('practical','Practical assessment')], default='quiz', max_length=16)),
            ('instructions', models.TextField(blank=True)), ('time_limit_minutes', models.PositiveIntegerField(blank=True, null=True)),
            ('pass_mark_percent', models.PositiveSmallIntegerField(default=50)), ('questions', models.JSONField(default=list)),
            ('state', models.CharField(choices=[('draft','Draft'),('submitted','Submitted'),('approved','Approved'),('rejected','Rejected'),('published','Published')], db_index=True, default='draft', max_length=12)),
            ('created_at', models.DateTimeField(auto_now_add=True)), ('updated_at', models.DateTimeField(auto_now=True)),
            ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assessments', to='catalog.course')),
            ('owner', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='studio_assessments', to=settings.AUTH_USER_MODEL)),
        ], options={'ordering':['-updated_at']}),
        migrations.AddConstraint(model_name='assessment', constraint=models.CheckConstraint(condition=models.Q(('pass_mark_percent__lte',100)), name='assessment_pass_mark_lte_100')),
        migrations.CreateModel(name='Project', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('title', models.CharField(max_length=200)), ('brief', models.TextField()), ('learning_outcomes', models.JSONField(default=list)),
            ('requirements', models.JSONField(default=list)), ('deliverables', models.JSONField(default=list)), ('estimated_hours', models.PositiveIntegerField(default=1)),
            ('state', models.CharField(choices=[('draft','Draft'),('submitted','Submitted'),('approved','Approved'),('rejected','Rejected'),('published','Published')], db_index=True, default='draft', max_length=12)),
            ('created_at', models.DateTimeField(auto_now_add=True)), ('updated_at', models.DateTimeField(auto_now=True)),
            ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='projects', to='catalog.course')),
            ('owner', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='studio_projects', to=settings.AUTH_USER_MODEL)),
        ], options={'ordering':['-updated_at']}),
        migrations.CreateModel(name='RubricCriterion', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('title', models.CharField(max_length=160)), ('description', models.TextField(blank=True)), ('points', models.PositiveIntegerField(default=10)), ('position', models.PositiveIntegerField(default=0)),
            ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rubric_criteria', to='authoring.project')),
        ], options={'ordering':['position','id']}),
    ]
