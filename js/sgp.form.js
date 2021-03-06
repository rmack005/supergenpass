(function() {

   // Default values
   var Origin=false,
   Source=false,
   Lang=location.search.substring(1),
   LatestVersion=20140420,
   AltDomain='',

   // Local storage support
   Storage=window.LocalStorage||window.localStorage,

   // Selector cache
   Sel=['PasswdField','Passwd','PasswdLabel','Salt','DomainField','Domain','DomainLabel','DisableTLD','Len','Generate','Mask','Output','Canvas','Options','Update'],

   // Send document height to bookmarklet.
   SendHeight=function() {
      if(Source&&Origin) {
         Source.postMessage('{"height":"'+$(document.body).height()+'"}',Origin);
      }
   },

   // Send generated password to bookmarklet.
   SendPasswd=function(Passwd) {
      if(Source&&Origin) {
         Source.postMessage('{"result":"'+Passwd+'"}',Origin);
      }
   },

   // Save configuration to local storage.
   SaveConfig=function(Salt,Len,Method,DisableTLD) {
      Storage.setItem('Salt',Salt);
      Storage.setItem('Len',Len);
      Storage.setItem('Method',Method);
      Storage.setItem('DisableTLD',DisableTLD||'');
   },

   // Get selected hash method.
   GetMethod=function() {
      return $('input:radio[name=Method]:checked').val() || 'md5';
   },

   // Populate selector cache.
   $el={};
   $.each(Sel, function(i, val) {
      $el[val]=$('#'+val);
   });

   // Perform localization if requested.
   if(Lang) {

      var Localizations=
         [
            ['en',   ['Master password','Domain / URL','Generate']],
            ['es',   ['Contraseña maestra','Dominio / URL','Enviar']],
            ['fr',   ['Mot de passe principal','Domaine / URL','Soumettre']],
            ['de',   ['Master Passwort','Domain / URL','Abschicken']],
            ['pt-br',['Senha-mestra','Domínio / URL','Gerar']],
            ['zh-hk',['主密碼','域名 / URL','提交']],
            ['hu',   ['Mesterjelszó','Tartomány / Internetcím','OK']],
            ['ru',   ['Мастер-пароль','Домена / URL','Подтвердить']]
         ];

      for(var i=0;i<Localizations.length;i++) {
         if(Lang==Localizations[i][0]) {
            $el.Passwd.attr('placeholder',Localizations[i][1][0]);
            $el.Domain.attr('placeholder',Localizations[i][1][1]);
            $el.PasswdLabel.text(Localizations[i][1][0]);
            $el.DomainLabel.text(Localizations[i][1][1]);
            $el.Generate.text(Localizations[i][1][2]);
            break;
         }
      }

   }

   // Show advanced options if requested.
   $el.Options.on('click', function() {
      $('body').toggleClass('Advanced');
      SendHeight();
   });

   // Show identicon if password or salt is present.
   $('#Passwd, #Salt, #MethodField').on('keyup change', function (event) {
      var Passwd=$el.Passwd.val(),Salt=$el.Salt.val(),Method=GetMethod();
      if(Passwd||Salt) {
         identicon5({
            canvas:$el.Canvas[0],
            hash:gp2_generate_hash(Passwd+Salt,Method),
            size:16
         });
         $el.Canvas.show();
      } else {
         $el.Canvas.hide();
      }
   });

   // Show alternate domain when TLD option is toggled.
   $el.DisableTLD.on('change', function (event) {
      var CurrentDomain=$el.Domain.val();
      if(AltDomain) {
         $el.Domain.val(AltDomain);
      }
      AltDomain=CurrentDomain;
   });

   // Toggle class on domain fieldset.
   $el.DisableTLD.on('change', function (event) {
      $el.DomainField.toggleClass('Advanced', $(this).is(':checked'));
   });

   // Retrieve configuration from local storage if available.
   var Config={
      Len:Storage.getItem('Len')||10,
      Salt:Storage.getItem('Salt')||'',
      Method:Storage.getItem('Method')||'md5',
      DisableTLD:Storage.getItem('DisableTLD')||''
   };
   $('input:radio[value='+Config.Method+']').prop('checked',true);
   $el.Len.val(gp2_validate_length(Config.Len,Config.Method));
   $el.Salt.val(Config.Salt).trigger('change');
   $el.DisableTLD.prop('checked',Config.DisableTLD).trigger('change');

   // Generate password.
   $el.Generate.on('click', function (event) {

      // Get input.
      var Passwd=$el.Passwd.val(),
      Salt=$el.Salt.val(),
      Method=GetMethod(),
      Domain=$el.Domain.val().replace(/ /g, ''),
      Len=gp2_validate_length($el.Len.val(),Method);
      DisableTLD=$el.DisableTLD.is(':checked');

      // Process domain value.
      AltDomain=(Domain)?gp2_process_uri(Domain,!DisableTLD):'';
      Domain=(Domain)?gp2_process_uri(Domain,DisableTLD):'';

      // Update form with validated input.
      $el.Domain.val(Domain).trigger('change');
      $el.Len.val(Len).trigger('change');

      if(!Passwd) {
         $el.PasswdField.addClass('Missing');
      }

      if(!Domain) {
         $el.DomainField.addClass('Missing');
      }

      if(Passwd&&Domain) {
         Passwd=gp2_generate_passwd(Passwd+Salt+':'+Domain,Len,Method);
         SendPasswd(Passwd);
         SaveConfig(Salt,Len,Method,DisableTLD);
         $el.Generate.hide();
         $el.Output.val(Passwd);
         $el.Mask.show();
      }

   });

   // Show generated password on click/touch.
   $el.Mask.on('click', function() {
      $el.Mask.hide();
      $el.Output.show().trigger('focus')[0].select();
   });

   // Hide generated password on click/touch elsewhere.
   $el.Output.on('blur', function() {
      $el.Output.hide();
      $el.Mask.show();
   });

   // Adjust password length.
   $('#Up, #Down').on('click', function (event) {
      var Method=GetMethod(),
      Len=gp2_validate_length(gp2_validate_length($el.Len.val(),Method)+(($(this).attr('id')=='Up')?1:-1),Method);
      $el.Len.val(Len).trigger('change');
   });

   // Clear generated password when input changes.
   $('fieldset > input').on('keydown change', function (event) {
      var key=event.which;
      if(event.type=='change'||key==8||key==32||(key>45&&key<91)||(key>95&&key<112)||(key>185&&key<223)) {
         $el.Mask.hide();
         $el.Output.val('').hide();
         $el.Generate.show();
         $el.PasswdField.removeClass('Missing');
         $el.DomainField.removeClass('Missing');
      } else if(key==13) {
         $(this).trigger('blur');
         $el.Generate.trigger('click');
         event.preventDefault();
      }
   });

   // Provide fake input placeholders if browser does not support them.
   if(!('placeholder' in document.createElement('input'))) {
      $('#Passwd, #Salt, #Domain').on('keyup change', function (event) {
         $('label[for='+$(this).attr('id')+']').toggle($(this).val()==='');
      }).trigger('change');
   }

   // Set focus on password field.
   $el.Passwd.trigger('focus');

   // Attach postMessage listener for bookmarklet.
   $(window).on('message', function (event) {

      // Gather information.
      var post=event.originalEvent;
      Source=post.source;
      Origin=post.origin;

      // Parse message.
      $.each(JSON.parse(post.data), function (key, value) {
         switch(key) {
            case 'version':
               if(value < LatestVersion) {
                  $el.Update.show();
               }
               break;
         }
      });

      // Populate domain field and call back with the browser height.
      $el.Domain.val(gp2_process_uri(Origin)).trigger('change');
      SendHeight();

   });

}());
